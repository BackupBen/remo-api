import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface ShowcaseMedia {
  mediaType?: "image" | "video";
  mediaUrl?: string | null;
  url?: string | null;
  src?: string | null;
  sourceUrl?: string | null;
  credit?: string | null;
  license?: string | null;
  start?: number;
  end?: number;
  prompt?: string;
  query?: string;
  fallbackNeeded?: boolean;
}

export interface ShowcaseGraphicStat {
  label?: string;
  value?: string;
}

export interface ShowcaseGraphicMoment {
  kind?: "specCard" | "timeline" | "opinion";
  startRatio?: number;
  durationSeconds?: number;
  headline?: string;
  subhead?: string;
  stats?: ShowcaseGraphicStat[];
  style?: "period-blueprint" | "gauge-card" | "archive-card";
}

export interface ShowcaseIntro {
  hook?: string;
  voiceover?: string;
  durationSeconds?: number;
  voiceoverDurationSeconds?: number;
  audioDurationSeconds?: number;
  voiceoverUrl?: string;
  audioUrl?: string;
  videos?: ShowcaseMedia[];
}

export interface ShowcaseCar {
  rank?: number;
  name?: string;
  years?: string;
  country?: string;
  hook?: string;
  voiceover?: string;
  chapterVoiceover?: string;
  facts?: string[];
  imageQueries?: string[];
  videoQueries?: string[];
  estimatedDurationSeconds?: number;
  durationSeconds?: number;
  voiceoverDurationSeconds?: number;
  audioDurationSeconds?: number;
  voiceoverUrl?: string;
  audioUrl?: string;
  image?: string;
  imageUrl?: string;
  images?: string[];
  imageUrls?: string[];
  mediaUrls?: string[];
  media?: ShowcaseMedia[];
  graphicMoments?: ShowcaseGraphicMoment[];
}

export interface OldtimerShowcaseProps {
  title?: string;
  subtitle?: string;
  category?: string;
  language?: string;
  outputLanguage?: string;
  targetDurationSeconds?: number;
  style?: string;
  intro?: ShowcaseIntro;
  cars?: ShowcaseCar[];
  outro?: {
    voiceover?: string;
    durationSeconds?: number;
    voiceoverDurationSeconds?: number;
    audioDurationSeconds?: number;
    voiceoverUrl?: string;
    audioUrl?: string;
  };
  creditsPolicy?: string;
}

type SectionTiming = {
  type: "intro" | "car" | "outro";
  from: number;
  duration: number;
  car?: ShowcaseCar;
  index?: number;
};

export const OLDTIMER_SHOWCASE_FPS = 30;

const DEFAULT_CHAPTER_SECONDS = 60;
const DEFAULT_OUTRO_SECONDS = 45;
const MIN_SECTION_FRAMES = 30;
const INTRO_VIDEO_CUT_SECONDS = 3.5;
const GOLD = "#d1a33b";
const GREEN = "#174f3f";
const RED = "#ad2f2d";
const INK = "#11100e";
const PAPER = "#f2ead8";

export const oldtimerShowcaseDefaultProps: OldtimerShowcaseProps = {
  title: "Ten British Roadsters That Defined the Sixties",
  subtitle: "Open-top icons with character, charm, and clever engineering",
  category: "British roadsters of the 1960s",
  language: "en",
  outputLanguage: "English",
  targetDurationSeconds: 720,
  intro: {
    hook: "A decade of wind, chrome, and compact sports cars.",
    voiceover:
      "In the 1960s, Britain turned the small roadster into a global symbol of freedom.",
    durationSeconds: 72,
    videos: [],
  },
  cars: [
    {
      rank: 1,
      name: "MGB Roadster",
      years: "1962-1980",
      country: "United Kingdom",
      hook: "The everyday sports car that became an icon.",
      voiceover:
        "The MGB was simple, approachable, and hugely popular, with clean styling and mechanical honesty that made it easy to love.",
      facts: [
        "Launched in 1962 as the successor to the MGA.",
        "Used a monocoque body instead of a separate frame.",
        "Became one of Britain's best-known export sports cars.",
      ],
      imageQueries: ["MGB Roadster classic car"],
      videoQueries: ["classic roadster driving"],
      estimatedDurationSeconds: 60,
      media: [],
    },
  ],
  outro: {
    voiceover:
      "These cars still make the road feel personal, mechanical, and wonderfully alive.",
    durationSeconds: 45,
  },
  creditsPolicy: "Collect credits and include them in the description.",
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const secondsToFrames = (seconds: number | undefined, fps: number) => {
  return Math.max(MIN_SECTION_FRAMES, Math.round((seconds || 0) * fps));
};

const getVoiceoverSeconds = (section?: {
  durationSeconds?: number;
  voiceoverDurationSeconds?: number;
  audioDurationSeconds?: number;
}) => {
  return (
    section?.audioDurationSeconds ||
    section?.voiceoverDurationSeconds ||
    section?.durationSeconds
  );
};

const cleanText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim() || fallback;
};

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trim()}...`;
};

const getMediaUrl = (media?: ShowcaseMedia | null) => {
  return media?.mediaUrl || media?.url || media?.src || "";
};

const getAudioUrl = (section?: {
  voiceoverUrl?: string;
  audioUrl?: string;
}) => {
  return section?.voiceoverUrl || section?.audioUrl || "";
};

const getCarAudioUrl = (car?: ShowcaseCar) => {
  return car?.voiceoverUrl || car?.audioUrl || "";
};

const getOverlayOpacity = (
  frame: number,
  duration: number,
  visibleFrames: number,
  fadeFrames: number
) => {
  const end = Math.max(1, Math.min(duration, visibleFrames));
  const fade = Math.max(1, Math.min(fadeFrames, Math.floor(end / 3)));
  const holdEnd = Math.max(fade, end - fade);

  return interpolate(frame, [0, fade, holdEnd, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

export const buildOldtimerShowcaseTimeline = (
  props: OldtimerShowcaseProps,
  fps = OLDTIMER_SHOWCASE_FPS
) => {
  const cars = (props.cars && props.cars.length > 0
    ? props.cars
    : oldtimerShowcaseDefaultProps.cars || []) as ShowcaseCar[];
  const introSeconds =
    getVoiceoverSeconds(props.intro) ||
    oldtimerShowcaseDefaultProps.intro?.durationSeconds ||
    72;
  const baseOutroSeconds =
    getVoiceoverSeconds(props.outro) || DEFAULT_OUTRO_SECONDS;
  const sharedChapterSeconds = DEFAULT_CHAPTER_SECONDS;

  const sections: SectionTiming[] = [];
  let cursor = 0;
  const introDuration = secondsToFrames(introSeconds, fps);
  sections.push({ type: "intro", from: cursor, duration: introDuration });
  cursor += introDuration;

  cars.forEach((car, index) => {
    const seconds =
      car.audioDurationSeconds ||
      car.voiceoverDurationSeconds ||
      car.durationSeconds ||
      car.estimatedDurationSeconds ||
      sharedChapterSeconds;
    const duration = secondsToFrames(seconds, fps);
    sections.push({ type: "car", from: cursor, duration, car, index });
    cursor += duration;
  });

  const outroDuration = secondsToFrames(baseOutroSeconds, fps);
  sections.push({ type: "outro", from: cursor, duration: outroDuration });
  cursor += outroDuration;

  return {
    cars,
    sections,
    totalFrames: Math.max(cursor, MIN_SECTION_FRAMES),
  };
};

export const getOldtimerShowcaseDurationInFrames = (
  props: OldtimerShowcaseProps,
  fps = OLDTIMER_SHOWCASE_FPS
) => {
  return buildOldtimerShowcaseTimeline(props, fps).totalFrames;
};

const FilmTexture: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 8px)",
      backgroundSize: "120px 100%, 100% 8px",
      opacity: 0.35,
    }}
  />
);

const BaseBackground: React.FC<{ accent?: string }> = ({ accent = GOLD }) => (
  <AbsoluteFill
    style={{
      backgroundColor: INK,
      backgroundImage:
        `linear-gradient(135deg, rgba(23,79,63,0.82), rgba(17,16,14,0.94) 48%, rgba(173,47,45,0.28)), linear-gradient(90deg, ${accent} 0 9px, transparent 9px 100%)`,
    }}
  >
    <FilmTexture />
  </AbsoluteFill>
);

const FadeWrap: React.FC<{
  duration: number;
  children: React.ReactNode;
}> = ({ duration, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, Math.max(24, duration - 24), duration],
    [1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const IntroVideoLayer: React.FC<{
  videos: ShowcaseMedia[];
  duration: number;
}> = ({ videos, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const validVideos = videos.filter((video) => getMediaUrl(video));

  if (validVideos.length === 0) {
    return null;
  }

  const cutFrames = Math.max(1, Math.round(INTRO_VIDEO_CUT_SECONDS * fps));
  const requiredCuts = Math.ceil(duration / cutFrames);
  const cutCount = Math.max(
    1,
    Math.min(validVideos.length, requiredCuts)
  );
  const hasEnoughClips = validVideos.length >= requiredCuts;
  const transitionFrames = Math.min(14, Math.max(4, Math.round(0.4 * fps)));

  return (
    <AbsoluteFill>
      {Array.from({ length: cutCount }).map((_, index) => {
        const video = validVideos[index];
        const from = index * cutFrames;
        const isFinalClip = index === cutCount - 1;
        const segmentDuration = Math.min(
          duration - from,
          hasEnoughClips && isFinalClip
            ? duration - from
            : cutFrames + (isFinalClip ? 0 : transitionFrames)
        );
        const fadeFrames = Math.max(
          1,
          Math.min(transitionFrames, Math.floor(segmentDuration / 3))
        );
        const localFrame = clamp(frame - from, 0, Math.max(1, segmentDuration));
        const scale = interpolate(
          localFrame,
          [0, Math.max(1, segmentDuration)],
          [1.02, 1.08],
          { extrapolateRight: "clamp" }
        );
        const opacity = interpolate(
          localFrame,
          [0, fadeFrames, Math.max(fadeFrames, segmentDuration - fadeFrames), segmentDuration],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        if (segmentDuration <= 0) {
          return null;
        }

        return (
          <Sequence
            key={`${getMediaUrl(video)}-${index}`}
            from={from}
            durationInFrames={segmentDuration}
          >
            <AbsoluteFill style={{ opacity }}>
              <OffthreadVideo
                src={getMediaUrl(video)}
                volume={0}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.05) saturate(0.88)",
                  transform: `scale(${scale})`,
                }}
              />
              <AbsoluteFill
                style={{
                  background:
                    "linear-gradient(90deg, rgba(17,16,14,0.72), rgba(17,16,14,0.18) 45%, rgba(17,16,14,0.64))",
                }}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const IntroScene: React.FC<{
  props: OldtimerShowcaseProps;
  duration: number;
}> = ({ props, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = cleanText(props.title, oldtimerShowcaseDefaultProps.title);
  const category = cleanText(props.category, props.subtitle || "");
  const introAudio = getAudioUrl(props.intro);
  const overlayOpacity = getOverlayOpacity(frame, duration, fps * 6, 18);
  const scale = spring({
    frame,
    fps,
    config: { stiffness: 55, damping: 18, mass: 0.9 },
  });
  const lineWidth = interpolate(frame, [18, 70], [0, 520], {
    extrapolateRight: "clamp",
  });

  return (
    <FadeWrap duration={duration}>
      <BaseBackground />
      <IntroVideoLayer videos={props.intro?.videos || []} duration={duration} />
      {introAudio ? <Audio src={introAudio} /> : null}
      <AbsoluteFill
        style={{
          opacity: overlayOpacity,
          justifyContent: "center",
          padding: "0 130px",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            color: GOLD,
            fontSize: 28,
            fontWeight: 800,
            textTransform: "uppercase",
            marginBottom: 24,
            letterSpacing: 0,
          }}
        >
          Classic Car Showcase
        </div>
        <div
          style={{
            color: PAPER,
            fontFamily: "Georgia, Times New Roman, serif",
            fontSize: 86,
            lineHeight: 1.02,
            maxWidth: 1180,
            transform: `scale(${0.96 + scale * 0.04})`,
            transformOrigin: "left center",
            textShadow: "0 6px 34px rgba(0,0,0,0.45)",
          }}
        >
          {truncate(title || "", 64)}
        </div>
        <div
          style={{
            width: lineWidth,
            height: 5,
            backgroundColor: RED,
            marginTop: 34,
            marginBottom: 28,
          }}
        />
        <div
          style={{
            color: "rgba(242,234,216,0.9)",
            fontSize: 34,
            lineHeight: 1.35,
            maxWidth: 1060,
            fontWeight: 600,
          }}
        >
          {truncate(category, 78)}
        </div>
      </AbsoluteFill>
    </FadeWrap>
  );
};

const getCarMediaItems = (car: ShowcaseCar) => {
  const seen = new Set<string>();
  const mediaItems: ShowcaseMedia[] = [];

  const addMedia = (item: ShowcaseMedia | string | null | undefined) => {
    if (!item) {
      return;
    }
    const media =
      typeof item === "string"
        ? ({ mediaType: "image", mediaUrl: item } satisfies ShowcaseMedia)
        : item;
    const url = getMediaUrl(media);
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    mediaItems.push({
      mediaType: media.mediaType || "image",
      ...media,
      mediaUrl: url,
    });
  };

  (car.media || []).forEach(addMedia);
  (car.images || []).forEach(addMedia);
  (car.imageUrls || []).forEach(addMedia);
  (car.mediaUrls || []).forEach(addMedia);
  addMedia(car.image || car.imageUrl || null);

  return mediaItems.slice(0, 8);
};

const compactFact = (value: string, maxLength = 64) => {
  return truncate(
    value
      .replace(/\s+/g, " ")
      .replace(/\.$/, "")
      .trim(),
    maxLength
  );
};

const splitSvgLines = (
  value: string,
  maxCharsPerLine: number,
  maxLines: number
) => {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      return;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  const clipped = lines.slice(0, maxLines);
  if (lines.length > maxLines && clipped.length > 0) {
    const last = clipped[clipped.length - 1].replace(/[.。]+$/, "");
    clipped[clipped.length - 1] = `${truncate(
      last,
      Math.max(12, maxCharsPerLine - 4)
    ).replace(/\.\.\.$/, "")}...`;
  }

  return clipped.length > 0 ? clipped : [""];
};

const getCarGraphicMoments = (car: ShowcaseCar): ShowcaseGraphicMoment[] => {
  const provided = (car.graphicMoments || [])
    .filter((moment) => moment && (moment.headline || moment.stats?.length))
    .map((moment, index) => ({
      kind: "specCard" as const,
      startRatio: index === 0 ? 0.22 : clamp(moment.startRatio ?? 0.58, 0.12, 0.82),
      durationSeconds: clamp(moment.durationSeconds ?? 5.5, 3.5, 8),
      style: moment.style || (index % 2 === 0 ? "period-blueprint" : "gauge-card"),
      ...moment,
    }));

  if (provided.length > 0) {
    return provided.slice(0, 2);
  }

  const facts = (car.facts || []).map((fact) => compactFact(fact)).filter(Boolean);
  const stats: ShowcaseGraphicStat[] = [
    { label: "Built", value: cleanText(car.years, "Period classic") },
    { label: "Origin", value: cleanText(car.country, "Classic car") },
    { label: "Detail", value: facts[0] || cleanText(car.hook, "Distinctive oldtimer character") },
  ].filter((stat) => stat.value);

  return [
    {
      kind: "specCard",
      startRatio: 0.22,
      durationSeconds: 5.8,
      headline: "What makes it matter",
      subhead: cleanText(car.name, "Classic car"),
      stats,
      style: "period-blueprint",
    },
  ];
};

const NostalgiaPhotoEffects: React.FC<{
  index: number;
  localFrame: number;
  span: number;
}> = ({ index, localFrame, span }) => {
  const flicker =
    0.93 +
    Math.sin((localFrame + index * 17) * 0.31) * 0.025 +
    Math.sin((localFrame + index * 9) * 0.07) * 0.018;
  const scratchShift = Math.round(localFrame * (0.35 + (index % 3) * 0.08));
  const reveal = interpolate(
    localFrame,
    [0, Math.max(1, Math.min(20, span * 0.12))],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity: reveal, pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: 0.12 * flicker,
          background:
            index % 2 === 0
              ? "linear-gradient(110deg, rgba(255,232,180,0.46) 0%, rgba(255,232,180,0.08) 28%, transparent 58%)"
              : "linear-gradient(250deg, rgba(209,163,59,0.38) 0%, rgba(209,163,59,0.08) 24%, transparent 55%)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.2,
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0px, transparent 46px, rgba(255,255,255,0.18) 47px, transparent 49px), repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, transparent 1px, transparent 5px)",
          backgroundPosition: `${scratchShift}px ${-scratchShift}px`,
          mixBlendMode: "soft-light",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.14,
          backgroundImage:
            "radial-gradient(circle at 18% 22%, rgba(255,255,255,0.32) 0 1px, transparent 2px), radial-gradient(circle at 72% 64%, rgba(0,0,0,0.36) 0 1px, transparent 2px), radial-gradient(circle at 44% 82%, rgba(255,255,255,0.22) 0 1px, transparent 2px)",
          backgroundSize: "74px 74px, 96px 96px, 132px 132px",
          backgroundPosition: `${scratchShift * 0.6}px 0, 0 ${scratchShift * 0.4}px, ${-scratchShift * 0.3}px ${scratchShift * 0.2}px`,
          mixBlendMode: "overlay",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, transparent 54%, rgba(17,16,14,0.34) 78%, rgba(17,16,14,0.74) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          boxShadow:
            "inset 0 0 0 18px rgba(242,234,216,0.045), inset 0 0 0 21px rgba(17,16,14,0.3), inset 0 0 90px rgba(17,16,14,0.52)",
        }}
      />
    </AbsoluteFill>
  );
};

const CarMediaItem: React.FC<{
  media: ShowcaseMedia;
  frame: number;
  start: number;
  end: number;
  index: number;
  transitionFrames: number;
}> = ({ media, frame, start, end, index, transitionFrames }) => {
  const mediaUrl = getMediaUrl(media);
  const span = Math.max(1, end - start);
  const fadeFrames = Math.max(1, Math.min(transitionFrames, Math.floor(span / 3)));
  const opacity =
    span < 4
      ? frame >= start && frame <= end
        ? 1
        : 0
      : interpolate(
          frame,
          [start, start + fadeFrames, end - fadeFrames, end],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
  const localFrame = clamp(frame - start, 0, Math.max(1, end - start));
  const scale = interpolate(localFrame, [0, Math.max(1, end - start)], [1.03, 1.12], {
    extrapolateRight: "clamp",
  });
  const drift = interpolate(localFrame, [0, Math.max(1, end - start)], [-24, 24], {
    extrapolateRight: "clamp",
  });
  const x = index % 3 === 1 ? -drift : index % 3 === 2 ? drift * 0.55 : 0;
  const y = index % 3 === 0 ? drift * 0.45 : 0;
  const rotation = media.mediaType === "video" ? 0 : (index % 2 === 0 ? -0.28 : 0.24);
  const mediaFilter =
    media.mediaType === "video"
      ? "contrast(1.06) saturate(0.94)"
      : "sepia(0.24) contrast(1.1) saturate(0.82) brightness(0.98)";
  const transform = `scale(${scale}) translate(${x}px, ${y}px) rotate(${rotation}deg)`;

  return (
    <AbsoluteFill style={{ opacity }}>
      {media.mediaType === "video" ? (
        <OffthreadVideo
          src={mediaUrl}
          volume={0}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: mediaFilter,
            transform,
          }}
        />
      ) : (
        <Img
          src={mediaUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: mediaFilter,
            transform,
          }}
        />
      )}
      {media.mediaType === "video" ? null : (
        <NostalgiaPhotoEffects index={index} localFrame={localFrame} span={span} />
      )}
    </AbsoluteFill>
  );
};

const CarMediaLayer: React.FC<{
  car: ShowcaseCar;
  duration: number;
}> = ({ car, duration }) => {
  const frame = useCurrentFrame();
  const mediaItems = getCarMediaItems(car);

  if (mediaItems.length === 0) {
    return (
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 68% 42%, rgba(209,163,59,0.22), transparent 0 22%, rgba(17,16,14,0.94) 48%)",
        }}
      >
        <div
          style={{
            width: 620,
            height: 620,
            border: `5px solid ${GOLD}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(242,234,216,0.12)",
            fontFamily: "Georgia, Times New Roman, serif",
            fontSize: 230,
            fontWeight: 900,
          }}
        >
          {String(car.rank || "").padStart(2, "0")}
        </div>
      </AbsoluteFill>
    );
  }

  const segmentFrames = Math.max(1, Math.ceil(duration / mediaItems.length));
  const transitionFrames = Math.min(
    30,
    Math.max(1, Math.floor(segmentFrames * 0.22))
  );

  return (
    <AbsoluteFill>
      {mediaItems.map((media, index) => {
        const start = Math.max(0, index * segmentFrames - (index === 0 ? 0 : transitionFrames));
        const rawEnd = index === mediaItems.length - 1 ? duration : (index + 1) * segmentFrames + transitionFrames;
        const end = Math.min(duration, Math.max(start + 1, rawEnd));

        return (
          <CarMediaItem
            key={`${getMediaUrl(media)}-${index}`}
            media={media}
            frame={frame}
            start={start}
            end={end}
            index={index}
            transitionFrames={transitionFrames}
          />
        );
      })}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(0deg, rgba(17,16,14,0.72) 0%, rgba(17,16,14,0.12) 38%, rgba(17,16,14,0.2) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const BlueprintSpecCard: React.FC<{
  moment: ShowcaseGraphicMoment;
  frame: number;
  start: number;
  duration: number;
  index: number;
}> = ({ moment, frame, start, duration, index }) => {
  const { fps } = useVideoConfig();
  const localFrame = frame - start;
  const fade = Math.max(10, Math.round(fps * 0.35));
  const opacity = interpolate(
    localFrame,
    [0, fade, Math.max(fade + 1, duration - fade), duration],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const entrance = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { stiffness: 62, damping: 20 },
  });
  const draw = interpolate(localFrame, [0, Math.max(1, fps * 1.25)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stats = (moment.stats || []).slice(0, 2);
  const isArchive = moment.style === "archive-card";
  const accent = index % 2 === 0 ? GOLD : RED;
  const cardY = interpolate(entrance, [0, 1], [34, 0]);
  const cardScale = interpolate(entrance, [0, 1], [0.985, 1]);
  const rawHeadline = cleanText(moment.headline, "Archive note");
  const displayHeadline =
    rawHeadline.toLowerCase() === "period signal"
      ? "Why it stood out"
      : rawHeadline;
  const headlineLines = splitSvgLines(displayHeadline, 26, 2);
  const subheadLines = splitSvgLines(cleanText(moment.subhead, ""), 36, 1);
  const carPathLength = 390;

  if (opacity <= 0.001) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        alignItems: "flex-start",
        justifyContent: "flex-end",
        paddingLeft: 88,
        paddingBottom: 74,
        pointerEvents: "none",
        opacity,
      }}
    >
      <svg
        width="720"
        height="292"
        viewBox="0 0 720 292"
        style={{
          transform: `translateY(${cardY}px) scale(${cardScale}) rotate(${isArchive ? -0.35 : 0.2}deg)`,
          filter: "drop-shadow(0 20px 44px rgba(0,0,0,0.42))",
        }}
      >
        <rect
          x="0"
          y="0"
          width="720"
          height="292"
          rx="8"
          fill={isArchive ? "rgba(242,234,216,0.9)" : "rgba(17,16,14,0.74)"}
          stroke={accent}
          strokeWidth="2"
        />
        <rect
          x="17"
          y="17"
          width="686"
          height="258"
          rx="4"
          fill="none"
          stroke={isArchive ? "rgba(17,16,14,0.32)" : "rgba(242,234,216,0.24)"}
          strokeWidth="1.5"
          strokeDasharray={`${Math.max(12, draw * 980)} 980`}
        />
        <path
          d="M42 92 H430 M42 244 H430"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(1, draw * 388)} 388`}
        />
        <text
          x="42"
          y="43"
          fill={isArchive ? INK : GOLD}
          fontFamily="Inter, Arial, sans-serif"
          fontSize="15"
          fontWeight="800"
          letterSpacing="0"
        >
          ARCHIVE NOTE
        </text>
        <text
          x="42"
          y="69"
          fill={isArchive ? INK : PAPER}
          fontFamily="Georgia, Times New Roman, serif"
          fontSize="31"
          fontWeight="700"
        >
          {headlineLines.map((line, lineIndex) => (
            <tspan key={`${line}-${lineIndex}`} x="42" dy={lineIndex === 0 ? 0 : 34}>
              {line}
            </tspan>
          ))}
        </text>
        <text
          x="42"
          y={headlineLines.length > 1 ? 140 : 118}
          fill={isArchive ? "rgba(17,16,14,0.72)" : "rgba(242,234,216,0.72)"}
          fontFamily="Inter, Arial, sans-serif"
          fontSize="19"
          fontWeight="700"
        >
          {subheadLines[0]}
        </text>

        <g
          transform="translate(474 98)"
          opacity={interpolate(localFrame, [fps * 0.35, fps * 0.95], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        >
          <path
            d="M28 104 C50 72 80 54 119 49 L169 49 C201 53 227 73 246 103 M24 105 H272 M78 105 A22 22 0 1 0 122 105 A22 22 0 1 0 78 105 M194 105 A22 22 0 1 0 238 105 A22 22 0 1 0 194 105 M94 49 C111 28 134 20 162 21 C181 23 199 35 217 53"
            fill="none"
            stroke={isArchive ? "rgba(17,16,14,0.64)" : "rgba(242,234,216,0.62)"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={carPathLength}
            strokeDashoffset={carPathLength - draw * carPathLength}
          />
          <path
            d="M16 132 H283"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(1, draw * 267)} 267`}
          />
          <text
            x="150"
            y="162"
            textAnchor="middle"
            fill={isArchive ? "rgba(17,16,14,0.58)" : "rgba(242,234,216,0.52)"}
            fontFamily="Inter, Arial, sans-serif"
            fontSize="15"
            fontWeight="800"
          >
            PERIOD DETAIL
          </text>
        </g>

        {stats.map((stat, statIndex) => {
          const rowY = 172 + statIndex * 58;
          const rowOpacity = interpolate(
            localFrame,
            [fps * 0.35 + statIndex * 8, fps * 0.7 + statIndex * 8],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const rowX = interpolate(rowOpacity, [0, 1], [-14, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const valueLines = splitSvgLines(cleanText(stat.value, ""), 33, 2);

          return (
            <g
              key={`${stat.label}-${statIndex}`}
              opacity={rowOpacity}
              transform={`translate(${rowX} 0)`}
            >
              <circle cx="49" cy={rowY - 8} r="4.5" fill={accent} />
              <text
                x="70"
                y={rowY - 18}
                fill={isArchive ? "rgba(17,16,14,0.62)" : "rgba(242,234,216,0.62)"}
                fontFamily="Inter, Arial, sans-serif"
                fontSize="14"
                fontWeight="800"
              >
                {truncate(cleanText(stat.label, "Detail").toUpperCase(), 16)}
              </text>
              <text
                x="70"
                y={rowY + 12}
                fill={isArchive ? INK : PAPER}
                fontFamily="Inter, Arial, sans-serif"
                fontSize="19"
                fontWeight="800"
              >
                {valueLines.map((line, lineIndex) => (
                  <tspan key={`${line}-${lineIndex}`} x="70" dy={lineIndex === 0 ? 0 : 22}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

const CarGraphicLayer: React.FC<{
  car: ShowcaseCar;
  duration: number;
}> = ({ car, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const moments = getCarGraphicMoments(car);

  return (
    <>
      {moments.map((moment, index) => {
        const momentFrames = Math.max(
          fps * 3,
          Math.round((moment.durationSeconds || 5.5) * fps)
        );
        const start = Math.min(
          Math.max(fps * 8, Math.round(duration * clamp(moment.startRatio ?? 0.22, 0.08, 0.86))),
          Math.max(0, duration - momentFrames - fps)
        );

        return (
          <BlueprintSpecCard
            key={`${moment.headline || "moment"}-${index}`}
            moment={moment}
            frame={frame}
            start={start}
            duration={Math.min(momentFrames, Math.max(1, duration - start))}
            index={index}
          />
        );
      })}
    </>
  );
};

const CarChapterScene: React.FC<{
  car: ShowcaseCar;
  index: number;
  total: number;
  duration: number;
}> = ({ car, index, total, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioUrl = getCarAudioUrl(car);
  const overlayOpacity = getOverlayOpacity(frame, duration, fps * 7, 18);
  const titleIn = spring({
    frame,
    fps,
    config: { stiffness: 75, damping: 18 },
  });
  const name = cleanText(car.name, "Unknown classic car");
  const hook = cleanText(car.hook, cleanText(car.voiceover || car.chapterVoiceover, ""));

  return (
    <FadeWrap duration={duration}>
      <BaseBackground accent={index % 2 === 0 ? GOLD : GREEN} />
      <CarMediaLayer car={car} duration={duration} />
      {audioUrl ? <Audio src={audioUrl} /> : null}
      <CarGraphicLayer car={car} duration={duration} />
      <AbsoluteFill
        style={{
          opacity: overlayOpacity,
          justifyContent: "flex-end",
          padding: "0 96px 82px 96px",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            color: GOLD,
            fontSize: 22,
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          <span>
            {String(car.rank || index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span style={{ width: 72, height: 3, backgroundColor: RED }} />
          <span>{cleanText(car.country, "Classic Car")}</span>
        </div>
        <div
          style={{
            color: PAPER,
            fontFamily: "Georgia, Times New Roman, serif",
            fontSize: 72,
            lineHeight: 1.02,
            marginTop: 24,
            maxWidth: 980,
            transform: `translateY(${(1 - titleIn) * 30}px)`,
            textShadow: "0 6px 32px rgba(0,0,0,0.45)",
          }}
        >
          {truncate(name, 64)}
        </div>
        <div
          style={{
            color: "rgba(242,234,216,0.76)",
            fontSize: 26,
            lineHeight: 1.3,
            marginTop: 12,
            fontWeight: 700,
          }}
        >
          {[car.years, car.country].filter(Boolean).join(" / ")}
        </div>
        {hook ? (
          <div
            style={{
              color: "rgba(242,234,216,0.9)",
              fontSize: 30,
              lineHeight: 1.25,
              maxWidth: 900,
              fontWeight: 700,
              marginTop: 22,
            }}
          >
            {truncate(hook, 92)}
          </div>
        ) : null}
      </AbsoluteFill>
    </FadeWrap>
  );
};

const OutroScene: React.FC<{
  props: OldtimerShowcaseProps;
  duration: number;
}> = ({ props, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({
    frame,
    fps,
    config: { stiffness: 50, damping: 18 },
  });
  const audioUrl = getAudioUrl(props.outro);
  const title = cleanText(props.title, oldtimerShowcaseDefaultProps.title);
  const voiceover = cleanText(
    props.outro?.voiceover,
    "Thanks for watching this classic car showcase."
  );

  return (
    <FadeWrap duration={duration}>
      <BaseBackground accent={RED} />
      {audioUrl ? <Audio src={audioUrl} /> : null}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 170px",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            color: GOLD,
            fontSize: 28,
            fontWeight: 800,
            textTransform: "uppercase",
            marginBottom: 34,
          }}
        >
          Classic Car Showcase
        </div>
        <div
          style={{
            color: PAPER,
            fontFamily: "Georgia, Times New Roman, serif",
            fontSize: 76,
            lineHeight: 1.08,
            maxWidth: 1220,
            transform: `scale(${0.97 + scale * 0.03})`,
          }}
        >
          {truncate(title, 92)}
        </div>
        <div
          style={{
            width: 520,
            height: 5,
            backgroundColor: RED,
            marginTop: 36,
            marginBottom: 34,
          }}
        />
        <div
          style={{
            color: "rgba(242,234,216,0.82)",
            fontSize: 34,
            lineHeight: 1.38,
            maxWidth: 1120,
            fontWeight: 600,
          }}
        >
          {truncate(voiceover, 220)}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 42,
            left: 90,
            right: 90,
            color: "rgba(242,234,216,0.46)",
            fontSize: 20,
            lineHeight: 1.35,
          }}
        >
          {truncate(cleanText(props.creditsPolicy, ""), 180)}
        </div>
      </AbsoluteFill>
    </FadeWrap>
  );
};

export const OldtimerShowcase: React.FC<OldtimerShowcaseProps> = (props) => {
  const { fps } = useVideoConfig();
  const mergedProps: OldtimerShowcaseProps = {
    ...oldtimerShowcaseDefaultProps,
    ...props,
    intro: {
      ...oldtimerShowcaseDefaultProps.intro,
      ...props.intro,
    },
    outro: {
      ...oldtimerShowcaseDefaultProps.outro,
      ...props.outro,
    },
  };
  const timeline = buildOldtimerShowcaseTimeline(mergedProps, fps);

  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {timeline.sections.map((section) => {
        if (section.type === "intro") {
          return (
            <Sequence key="intro" from={section.from} durationInFrames={section.duration}>
              <IntroScene props={mergedProps} duration={section.duration} />
            </Sequence>
          );
        }

        if (section.type === "outro") {
          return (
            <Sequence key="outro" from={section.from} durationInFrames={section.duration}>
              <OutroScene props={mergedProps} duration={section.duration} />
            </Sequence>
          );
        }

        return (
          <Sequence
            key={`car-${section.index}`}
            from={section.from}
            durationInFrames={section.duration}
          >
            <CarChapterScene
              car={section.car || {}}
              index={section.index || 0}
              total={timeline.cars.length}
              duration={section.duration}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
