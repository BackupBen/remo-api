# Remotion Video API Server – Projektspezifikation

## Ziel

Baue einen vollständigen **Remotion Video Rendering API Server**, der als Docker-Container auf Coolify (Hetzner VPS) deployed wird und über eine REST-API von einem externen n8n (lokales Netzwerk) angesprochen werden kann. Der Server nimmt JSON-Daten entgegen (Texte, Bild-URLs, Konfiguration) und rendert daraus automatisiert MP4-Videos.

---

## Technologie-Stack

- **Runtime:** Node.js 22 (LTS)
- **Framework:** Express.js (API-Server)
- **Rendering:** Remotion v4 (`@remotion/renderer`, `@remotion/bundler`)
- **Video-Templates:** React + TypeScript
- **Container:** Docker (`node:22-bookworm-slim`)
- **Deployment:** Coolify auf Hetzner VPS
- **Client:** n8n via HTTP Request

---

## Projektstruktur

```
remotion-api-server/
├── src/
│   ├── index.ts                 # Remotion Entry Point
│   ├── Root.tsx                 # Registriert alle Compositions
│   └── templates/
│       ├── SocialClip.tsx       # Template: Social Media Clip
│       ├── ImageSlideshow.tsx   # Template: Bilder-Slideshow
│       └── TextAnimation.tsx    # Template: Animierter Text
├── public/                      # Statische Assets (Fonts, Logos etc.)
├── api-server.mjs               # Express API Server
├── Dockerfile                   # Docker Build Konfiguration
├── package.json
├── tsconfig.json
└── remotion.config.ts
```

---

## API-Server (`api-server.mjs`)

### Anforderungen

- Express.js Server auf Port **3001**
- Beim Start automatisch das Remotion-Bundle erstellen und cachen (nur einmalig)
- API-Key-Authentifizierung über `x-api-key` Header
- API-Key wird aus der Environment Variable `API_KEY` gelesen
- Gerenderte Videos werden in `/app/out/` gespeichert
- Asynchrones Rendering: Render-Job wird sofort mit einer Job-ID beantwortet, Rendering läuft im Hintergrund

### Endpunkte

#### `GET /health`

Gibt den Server-Status zurück.

Response:
```json
{
  "status": "ok",
  "bundled": true,
  "uptime": 12345
}
```

#### `GET /compositions`

Listet alle verfügbaren Video-Templates mit ihren Props auf.

Response:
```json
{
  "compositions": [
    {
      "id": "SocialClip",
      "width": 1080,
      "height": 1920,
      "fps": 30,
      "durationInFrames": 150,
      "defaultProps": {
        "title": "Titel hier",
        "subtitle": "Untertitel",
        "backgroundImage": "",
        "accentColor": "#FF6B6B"
      }
    }
  ]
}
```

#### `POST /render`

Startet einen neuen Render-Job.

Request Body:
```json
{
  "compositionId": "SocialClip",
  "props": {
    "title": "Mein Video",
    "subtitle": "Erstellt via API",
    "backgroundImage": "https://example.com/bild.jpg",
    "accentColor": "#4ECDC4"
  },
  "codec": "h264",
  "outputFormat": "mp4"
}
```

Response:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "rendering"
}
```

#### `GET /status/:jobId`

Gibt den aktuellen Status eines Render-Jobs zurück.

Response (während Rendering):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "rendering",
  "progress": 0.45
}
```

Response (fertig):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "done",
  "downloadUrl": "/download/550e8400-e29b-41d4-a716-446655440000.mp4"
}
```

Response (Fehler):
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "error",
  "error": "Composition not found"
}
```

#### `GET /download/:filename`

Liefert das fertige Video als Datei-Download.

#### `POST /upload`

Nimmt eine Bilddatei entgegen (Multipart Form-Data) und speichert sie im `public/`-Ordner, damit Remotion per `staticFile()` darauf zugreifen kann.

Request: Multipart Form-Data mit Feld `file`

Response:
```json
{
  "filename": "abc123-bild.jpg",
  "url": "/public/abc123-bild.jpg"
}
```

### Middleware

- **API-Key Check** auf allen Endpunkten (außer `/health`)
- **CORS** aktiviert (oder auf bestimmte Origins beschränkt)
- **Body Size Limit** auf 50 MB setzen (für Base64-Bilder in Props)
- **Error Handling** Middleware, die Fehler als JSON zurückgibt

### Job-Verwaltung

- Jobs werden in einer In-Memory `Map` gespeichert: `Map<jobId, { status, progress, file, error }>`
- Erledigte Jobs und deren Videodateien werden nach **1 Stunde** automatisch aufgeräumt (Cleanup-Intervall)
- Maximal **2 gleichzeitige Render-Jobs** (Queue, weitere Jobs warten)

---

## Video-Templates

Alle Templates sind React-Komponenten in `src/templates/`. Jedes Template bekommt seine Daten über Props.

### Template 1: `SocialClip` (1080×1920, 30fps, 5 Sekunden)

Hochformat-Video für Social Media (Instagram Reels, TikTok, YouTube Shorts).

**Props:**
```typescript
interface SocialClipProps {
  title: string;           // Haupttext, groß animiert
  subtitle: string;        // Kleinerer Text darunter
  backgroundImage: string; // URL zu einem Hintergrundbild
  accentColor: string;     // Akzentfarbe (Hex)
}
```

**Animationen:**
- Hintergrundbild: Langsamer Ken-Burns-Zoom (scale 1 → 1.2 über gesamte Dauer)
- Dunkles Overlay über dem Bild (halbtransparentes Schwarz)
- Titel: Fade-In + leichter Scale-Bounce von unten (spring-Animation, ab Frame 15)
- Untertitel: Fade-In von unten, 15 Frames nach dem Titel
- Akzentfarbe als Unterstreichung oder Highlight-Element unter dem Titel

### Template 2: `ImageSlideshow` (1080×1920, 30fps, dynamische Dauer)

Mehrere Bilder nacheinander mit Übergängen.

**Props:**
```typescript
interface ImageSlideshowProps {
  images: string[];           // Array von Bild-URLs
  transitionType: "fade" | "slide" | "zoom";  // Übergangsart
  secondsPerImage: number;    // Anzeigedauer pro Bild (Standard: 3)
  title?: string;             // Optionaler Titel am Anfang
  musicUrl?: string;          // Optionale Hintergrundmusik-URL
}
```

**Animationen:**
- Jedes Bild wird als eigene `<Sequence>` gerendert
- Dauer wird dynamisch berechnet: `images.length * secondsPerImage * fps`
- Übergänge zwischen den Bildern:
  - `fade`: Crossfade (Opacity)
  - `slide`: Altes Bild gleitet raus, neues rein
  - `zoom`: Altes Bild zoomt rein, neues erscheint dahinter
- Jedes Bild hat einen leichten Ken-Burns-Effekt
- Optionaler Titel am Anfang mit Fade-In

### Template 3: `TextAnimation` (1920×1080, 30fps, dynamische Dauer)

Querformat. Animierter Text auf farbigem Hintergrund – ideal für Zitate, Announcements.

**Props:**
```typescript
interface TextAnimationProps {
  text: string;              // Der zu animierende Text
  style: "typewriter" | "fade-words" | "bounce-in";  // Animationsstil
  fontSize: number;          // Schriftgröße in px (Standard: 72)
  fontColor: string;         // Textfarbe (Hex)
  backgroundColor: string;   // Hintergrundfarbe (Hex)
  textAlign: "left" | "center" | "right";
}
```

**Animationen:**
- `typewriter`: Text wird Zeichen für Zeichen aufgebaut, blinkender Cursor am Ende
- `fade-words`: Jedes Wort blendet einzeln ein (zeitversetzt, jeweils 10 Frames Abstand)
- `bounce-in`: Jedes Wort springt mit spring()-Animation ins Bild (leichter Overshoot)
- Dauer dynamisch: Abhängig von Textlänge und Animationsstil

### Gemeinsame Design-Richtlinien für alle Templates

- Standardschrift: Inter oder ein anderer Google Font, der im Container installiert wird
- Alle Bilder werden über `<Img>` von Remotion geladen (wartet auf vollständiges Laden)
- Externe Bild-URLs werden direkt als `src` verwendet
- Alle Farben kommen über Props – keine fest codierten Farbwerte
- Alle Templates müssen fehlertolerant sein: fehlende Bilder oder leere Texte dürfen nicht crashen

---

## Composition-Registrierung (`src/Root.tsx`)

Alle Templates werden hier als `<Composition>` registriert. Die `ImageSlideshow` nutzt `calculateMetadata` um die Dauer dynamisch basierend auf der Anzahl der Bilder zu berechnen.

```tsx
// Beispielstruktur
<>
  <Composition
    id="SocialClip"
    component={SocialClip}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={150}
    defaultProps={{ ... }}
  />
  <Composition
    id="ImageSlideshow"
    component={ImageSlideshow}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={90}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.images.length * props.secondsPerImage * 30,
    })}
    defaultProps={{ ... }}
  />
  <Composition
    id="TextAnimation"
    component={TextAnimation}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={150}
    defaultProps={{ ... }}
  />
</>
```

---

## Dockerfile

```dockerfile
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y \
  libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev \
  libasound2 libxrandr2 libxkbcommon-dev \
  libxfixes3 libxcomposite1 libxdamage1 \
  libatk-bridge2.0-0 libpango-1.0-0 libcairo2 \
  libcups2 fonts-noto-core fonts-noto-color-emoji \
  fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npx remotion browser ensure

RUN mkdir -p /app/out

EXPOSE 3001

CMD ["node", "api-server.mjs"]
```

---

## Environment Variables (für Coolify)

| Variable | Beschreibung | Beispielwert |
|----------|-------------|--------------|
| `API_KEY` | Geheimer Schlüssel für API-Zugriff | `sk-remotion-abc123xyz` |
| `PORT` | Server-Port (optional, Standard 3001) | `3001` |
| `CONCURRENCY` | Anzahl paralleler Frame-Renderer (optional) | `4` |
| `MAX_CONCURRENT_RENDERS` | Max gleichzeitige Render-Jobs | `2` |

---

## Wichtige technische Hinweise

### Bundling
- Das Remotion-Bundle (`bundle()`) wird **einmal beim Server-Start** erstellt und in einer Variable gecacht
- Nicht bei jedem Request neu bundlen – das dauert 5–10 Sekunden

### Speicher & Cleanup
- Gerenderte Videos in `/app/out/` werden nach 1 Stunde gelöscht
- Ein `setInterval` prüft alle 10 Minuten auf alte Dateien

### Fehlerbehandlung
- Wenn eine Composition-ID nicht existiert → 400 Bad Request
- Wenn ein Render fehlschlägt → Job-Status auf `error` setzen mit Fehlermeldung
- Wenn der Server keinen freien Render-Slot hat → Job in eine Queue stellen und Status `queued` zurückgeben

### Sicherheit
- API-Key wird bei **jedem** Request geprüft (außer `/health`)
- Keine Shell-Commands aus User-Input ableiten
- Dateinamen werden sanitized (nur UUID + Erweiterung)
- Upload-Endpunkt akzeptiert nur Bildformate (jpg, png, webp, gif)

### Performance
- Chrome-Browser mit `openBrowser()` einmalig öffnen und für alle Renders wiederverwenden
- `enableMultiProcessOnLinux: true` setzen für bessere Performance auf Linux

---

## Dependencies (`package.json`)

```json
{
  "name": "remotion-api-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "npx remotion studio",
    "api": "node api-server.mjs",
    "build": "remotion bundle"
  },
  "dependencies": {
    "@remotion/bundler": "^4.0.0",
    "@remotion/renderer": "^4.0.0",
    "@remotion/cli": "^4.0.0",
    "remotion": "^4.0.0",
    "express": "^4.18.0",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/express": "^4.17.0",
    "typescript": "^5.0.0"
  }
}
```

---

## Beispiel: n8n HTTP Request an die API

### Render starten
```
Method: POST
URL: https://remotion.deine-domain.de/render
Headers:
  x-api-key: sk-remotion-abc123xyz
  Content-Type: application/json
Body:
{
  "compositionId": "SocialClip",
  "props": {
    "title": "Neues Produkt!",
    "subtitle": "Jetzt verfügbar",
    "backgroundImage": "https://images.unsplash.com/photo-xxx",
    "accentColor": "#FF6B6B"
  }
}
```

### Status prüfen
```
Method: GET
URL: https://remotion.deine-domain.de/status/{{jobId}}
Headers:
  x-api-key: sk-remotion-abc123xyz
```

### Video herunterladen
```
Method: GET
URL: https://remotion.deine-domain.de/download/{{filename}}
Headers:
  x-api-key: sk-remotion-abc123xyz
```
