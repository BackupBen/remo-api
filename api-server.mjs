import express from "express";
import { bundle } from "@remotion/bundler";
import { renderMedia, getCompositions, openBrowser } from "@remotion/renderer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Config ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || "";
const MAX_CONCURRENT_RENDERS = parseInt(process.env.MAX_CONCURRENT_RENDERS || "2", 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "4", 10);
const OUT_DIR = path.join("/app", "out");
const PUBLIC_DIR = path.join(__dirname, "public");
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── State ───────────────────────────────────────────────────────────
let bundleLocation = null;
let browserInstance = null;
const jobs = new Map();
let activeRenders = 0;
const renderQueue = [];

// ─── Ensure directories ──────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// ─── Express App ─────────────────────────────────────────────────────
const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-api-key");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ─── API Key Middleware ──────────────────────────────────────────────
function apiKeyAuth(req, res, next) {
  if (req.path === "/health") return next();

  const key = req.headers["x-api-key"];
  if (!API_KEY) return next(); // No key configured = open access
  if (key !== API_KEY) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }
  next();
}
app.use(apiKeyAuth);

// ─── Upload config (multer) ─────────────────────────────────────────
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp3", ".wav", ".aac"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PUBLIC_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ─── Routes ──────────────────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    bundled: bundleLocation !== null,
    uptime: process.uptime(),
  });
});

// List compositions
app.get("/compositions", async (req, res, next) => {
  try {
    if (!bundleLocation) {
      return res.status(503).json({ error: "Server is still bundling. Please wait." });
    }
    const compositions = await getCompositions(bundleLocation, {
      chromiumOptions: { enableMultiProcessOnLinux: true },
    });
    const result = compositions.map((c) => ({
      id: c.id,
      width: c.width,
      height: c.height,
      fps: c.fps,
      durationInFrames: c.durationInFrames,
      defaultProps: c.defaultProps,
    }));
    res.json({ compositions: result });
  } catch (err) {
    next(err);
  }
});

// Start render
app.post("/render", async (req, res, next) => {
  try {
    if (!bundleLocation) {
      return res.status(503).json({ error: "Server is still bundling. Please wait." });
    }

    const { compositionId, props, codec, outputFormat } = req.body;

    if (!compositionId) {
      return res.status(400).json({ error: "compositionId is required" });
    }

    // Validate composition exists
    const compositions = await getCompositions(bundleLocation, {
      inputProps: props || {},
      chromiumOptions: { enableMultiProcessOnLinux: true },
    });
    const composition = compositions.find((c) => c.id === compositionId);

    if (!composition) {
      return res.status(400).json({ error: `Composition "${compositionId}" not found` });
    }

    const jobId = uuidv4();
    const outputFile = path.join(OUT_DIR, `${jobId}.mp4`);

    jobs.set(jobId, {
      status: activeRenders >= MAX_CONCURRENT_RENDERS ? "queued" : "rendering",
      progress: 0,
      file: outputFile,
      error: null,
      createdAt: Date.now(),
    });

    if (activeRenders >= MAX_CONCURRENT_RENDERS) {
      renderQueue.push({ jobId, composition, props, codec, outputFile });
      return res.json({ jobId, status: "queued" });
    }

    // Start rendering in background
    startRender(jobId, composition, props, codec, outputFile);

    res.json({ jobId, status: "rendering" });
  } catch (err) {
    next(err);
  }
});

// Job status
app.get("/status/:jobId", (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  const response = { jobId, status: job.status };

  if (job.status === "rendering") {
    response.progress = job.progress;
  } else if (job.status === "done") {
    response.downloadUrl = `/download/${jobId}.mp4`;
  } else if (job.status === "error") {
    response.error = job.error;
  }

  res.json(response);
});

// Download video
app.get("/download/:filename", (req, res) => {
  const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, "");
  const filePath = path.join(OUT_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.download(filePath);
});

// Upload image
app.post("/upload", upload.single("file"), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({
      filename: req.file.filename,
      url: `/public/${req.file.filename}`,
    });
  } catch (err) {
    next(err);
  }
});

// Serve public files
app.use("/public", express.static(PUBLIC_DIR));

// ─── Error Handling ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// ─── Render Logic ────────────────────────────────────────────────────
async function startRender(jobId, composition, props, codec, outputFile) {
  activeRenders++;

  try {
    const job = jobs.get(jobId);
    if (job) job.status = "rendering";

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: codec || "h264",
      outputLocation: outputFile,
      inputProps: props || {},
      concurrency: CONCURRENCY,
      chromiumOptions: { enableMultiProcessOnLinux: true },
      onProgress: ({ progress }) => {
        const j = jobs.get(jobId);
        if (j) j.progress = progress;
      },
    });

    const job2 = jobs.get(jobId);
    if (job2) {
      job2.status = "done";
      job2.progress = 1;
    }
    console.log(`✓ Render complete: ${jobId}`);
  } catch (err) {
    console.error(`✗ Render failed: ${jobId}`, err.message);
    const job = jobs.get(jobId);
    if (job) {
      job.status = "error";
      job.error = err.message;
    }
  } finally {
    activeRenders--;
    processQueue();
  }
}

function processQueue() {
  while (renderQueue.length > 0 && activeRenders < MAX_CONCURRENT_RENDERS) {
    const next = renderQueue.shift();
    startRender(next.jobId, next.composition, next.props, next.codec, next.outputFile);
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────────
function cleanup() {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) {
      // Delete video file
      if (job.file && fs.existsSync(job.file)) {
        fs.unlinkSync(job.file);
        console.log(`Cleaned up file: ${job.file}`);
      }
      jobs.delete(jobId);
      console.log(`Cleaned up job: ${jobId}`);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL_MS);

// ─── Startup ─────────────────────────────────────────────────────────
async function start() {
  console.log("Bundling Remotion project...");
  try {
    bundleLocation = await bundle({
      entryPoint: path.resolve(__dirname, "src", "index.ts"),
      webpackOverride: (config) => config,
    });
    console.log(`✓ Bundle ready at: ${bundleLocation}`);
  } catch (err) {
    console.error("✗ Bundling failed:", err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✓ API server running on port ${PORT}`);
    console.log(`  Max concurrent renders: ${MAX_CONCURRENT_RENDERS}`);
    console.log(`  Concurrency per render: ${CONCURRENCY}`);
    console.log(`  API key: ${API_KEY ? "configured" : "NOT SET (open access)"}`);
  });
}

start();
