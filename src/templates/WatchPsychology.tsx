import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type WatchPsychologyMedia = {
  mediaType?: "image" | "video";
  mediaUrl?: string | null;
  url?: string | null;
  src?: string | null;
  sourceUrl?: string | null;
  credit?: string | null;
};

export type WatchPsychologyBeat = {
  spokenText?: string;
  mediaSubject?: string;
  mediaQuery?: string;
  mediaQueries?: string[];
  imagePrompt?: string;
  durationSeconds?: number;
  startRatio?: number;
  media?: WatchPsychologyMedia[];
};

export type WatchPsychologySection = {
  eyebrow?: string;
  title?: string;
  body?: string;
  voiceover?: string;
  durationSeconds?: number;
  voiceoverDurationSeconds?: number;
  audioDurationSeconds?: number;
  voiceoverUrl?: string;
  audioUrl?: string;
  media?: WatchPsychologyMedia[];
  visualBeats?: WatchPsychologyBeat[];
};

export type WatchPsychologyGraphicPoint = {
  label?: string;
  value?: number;
  displayValue?: string;
};

export type WatchPsychologyGraphicMoment = {
  kind?: "stat-badge" | "bar-chart" | "timeline-card";
  startRatio?: number;
  durationSeconds?: number;
  headline?: string;
  subhead?: string;
  highlight?: string;
  bullets?: string[];
  dataPoints?: WatchPsychologyGraphicPoint[];
};

export type WatchPsychologyInsight = WatchPsychologySection & {
  number?: number;
  label?: string;
  factType?: "status" | "identity" | "scarcity" | "ritual" | "market";
  highlight?: string;
  graphicMoments?: WatchPsychologyGraphicMoment[];
};

export type WatchPsychologyProps = {
  title?: string;
  subtitle?: string;
  category?: string;
  intro?: WatchPsychologySection;
  facts?: WatchPsychologyInsight[];
  outro?: WatchPsychologySection;
  backgroundMusicUrl?: string;
};

type TimelineSection = {
  type: "intro" | "fact" | "outro";
  from: number;
  duration: number;
  fact?: WatchPsychologyInsight;
  index?: number;
};

type ResolvedBeatMedia = {
  media: WatchPsychologyMedia;
  spokenText?: string;
  mediaQuery?: string;
  durationSeconds?: number;
  startRatio?: number;
};

const FPS = 30;
const MIN_SECTION_FRAMES = 45;
const DEFAULT_INTRO_SECONDS = 16;
const DEFAULT_FACT_SECONDS = 18;
const DEFAULT_OUTRO_SECONDS = 12;

const INK = "#12100e";
const PAPER = "#f4ecdd";
const BRASS = "#c9a15a";
const OXBLOOD = "#6f1f20";
const OLIVE = "#344034";
const SMOKE = "#d7c8ae";

const sampleInsights: WatchPsychologyInsight[] = [
  {
    number: 1,
    label: "Scarcity loop",
    factType: "scarcity",
    title: "Waiting lists turn patience into part of the product",
    body: "The watch is no longer just an object. The wait becomes a private story about deserving it.",
    highlight: "Scarcity feels more meaningful when it arrives dressed as recognition.",
  },
  {
    number: 2,
    label: "Status signal",
    factType: "status",
    title: "Quiet watches still communicate loudly to the right people",
    body: "Most status signaling in watches is not aimed at everyone. It is aimed at the few who know what they are seeing.",
    highlight: "Luxury often wants selective legibility, not mass approval.",
  },
  {
    number: 3,
    label: "Identity story",
    factType: "identity",
    title: "Collectors often buy watches for future versions of themselves",
    body: "A dress watch can stand for discipline, a diver for rugged competence, and a vintage piece for cultivated taste.",
    highlight: "The purchase is often autobiographical before it is practical.",
  },
  {
    number: 4,
    label: "Ritual comfort",
    factType: "ritual",
    title: "Setting and winding a watch can feel calming because it is controllable",
    body: "The ritual is small, repeatable, and tactile. It creates a pocket of order in a noisy day.",
    highlight: "Mechanical ritual gives form to attention.",
  },
  {
    number: 5,
    label: "Market mirror",
    factType: "market",
    title: "Price charts influence desire even when collectors say they do not care",
    body: "People rarely separate taste from perceived value as cleanly as they think they do.",
    highlight: "Markets can make emotion feel rational.",
  },
  {
    number: 6,
    label: "Belonging",
    factType: "identity",
    title: "Watch language creates instant in-groups",
    body: "Reference numbers, dial nicknames, and bracelet debates make strangers feel like insiders with shared codes.",
    highlight: "Fluency can become a form of social membership.",
  },
  {
    number: 7,
    label: "Mythmaking",
    factType: "status",
    title: "Brand heritage works because it lets buyers borrow significance",
    body: "A century of stories can make a modern purchase feel connected to craft, adventure, and continuity.",
    highlight: "People often buy into a timeline, not just a case and movement.",
  },
  {
    number: 8,
    label: "Resolution",
    factType: "ritual",
    title: "The best collections often become calmer over time",
    body: "Early collecting can be driven by novelty. Later collecting is often driven by clarity, editing, and self-understanding.",
    highlight: "Maturity in collecting usually looks quieter, not louder.",
  },
];

export const watchPsychologyDefaultProps: WatchPsychologyProps = {
  title: "Why Watches Mean More Than Time",
  subtitle: "Status, ritual, scarcity, and identity in watch collecting",
  category: "Watch Psychology",
  intro: {
    eyebrow: "Watch Psychology",
    title: "What people are really buying when they buy a watch",
    body: "Beyond steel, gold, and complications sits a deeper story about status, belonging, ritual, and self-image.",
    voiceover:
      "Luxury watches are never only about time. They sit at the intersection of status, ritual, scarcity, and identity, which is exactly why people care so much about them.",
    durationSeconds: 16,
  },
  facts: sampleInsights,
  outro: {
    eyebrow: "Closing thought",
    title: "The object matters, but the meaning matters more",
    body: "The most revealing part of watch culture is often not the watch itself, but the story people build around wearing it.",
    voiceover:
      "That is what makes watch collecting so psychologically rich. The object matters, but the meaning people attach to it matters even more.",
    durationSeconds: 12,
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const secondsToFrames = (seconds: number | undefined, fps: number) =>
  Math.max(MIN_SECTION_FRAMES, Math.round((seconds || 0) * fps));

const cleanText = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
};

const truncate = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}...`;
};

const splitLines = (value: string, maxCharsPerLine: number, maxLines: number) => {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });

  if (current) lines.push(current);
  const clipped = lines.slice(0, maxLines);
  if (lines.length > maxLines && clipped.length > 0) {
    clipped[clipped.length - 1] = `${truncate(
      clipped[clipped.length - 1],
      Math.max(12, maxCharsPerLine - 4)
    ).replace(/\.\.\.$/, "")}...`;
  }
  return clipped.length > 0 ? clipped : [""];
};

const compactText = (value: string, maxLength = 56) =>
  truncate(
    value
      .replace(/\s+/g, " ")
      .replace(/\.$/, "")
      .trim(),
    maxLength
  );

const getMediaUrl = (media?: WatchPsychologyMedia | null) =>
  media?.mediaUrl || media?.url || media?.src || "";

const getAudioUrl = (section?: { voiceoverUrl?: string; audioUrl?: string }) =>
  section?.voiceoverUrl || section?.audioUrl || "";

const getSectionSeconds = (section?: {
  durationSeconds?: number;
  voiceoverDurationSeconds?: number;
  audioDurationSeconds?: number;
}) =>
  section?.audioDurationSeconds ||
  section?.voiceoverDurationSeconds ||
  section?.durationSeconds;

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

const buildTimeline = (props: WatchPsychologyProps, fps = FPS) => {
  const facts = (props.facts && props.facts.length > 0
    ? props.facts
    : watchPsychologyDefaultProps.facts || []) as WatchPsychologyInsight[];
  const sections: TimelineSection[] = [];
  let cursor = 0;

  const introDuration = secondsToFrames(
    getSectionSeconds(props.intro) || DEFAULT_INTRO_SECONDS,
    fps
  );
  sections.push({ type: "intro", from: cursor, duration: introDuration });
  cursor += introDuration;

  facts.forEach((fact, index) => {
    const factDuration = secondsToFrames(
      getSectionSeconds(fact) || DEFAULT_FACT_SECONDS,
      fps
    );
    sections.push({ type: "fact", from: cursor, duration: factDuration, fact, index });
    cursor += factDuration;
  });

  const outroDuration = secondsToFrames(
    getSectionSeconds(props.outro) || DEFAULT_OUTRO_SECONDS,
    fps
  );
  sections.push({ type: "outro", from: cursor, duration: outroDuration });
  cursor += outroDuration;

  return { facts, sections, totalFrames: Math.max(cursor, MIN_SECTION_FRAMES) };
};

export const getWatchPsychologyDurationInFrames = (
  props: WatchPsychologyProps,
  fps = FPS
) => buildTimeline(props, fps).totalFrames;

const getMediaItems = (section?: WatchPsychologySection | WatchPsychologyInsight) => {
  const seen = new Set<string>();
  const items: WatchPsychologyMedia[] = [];
  (section?.media || []).forEach((media) => {
    const url = getMediaUrl(media);
    if (!url || seen.has(url)) return;
    seen.add(url);
    items.push({ mediaType: media.mediaType || "image", ...media, mediaUrl: url });
  });
  return items.slice(0, 10);
};

const getBeatMediaItems = (beats?: WatchPsychologyBeat[]) => {
  const items: ResolvedBeatMedia[] = [];
  (beats || []).forEach((beat) => {
    const media = getMediaItems({ media: beat.media || [] });
    const primary = media[0];
    if (!primary) return;
    items.push({
      media: primary,
      spokenText: cleanText(beat.spokenText, ""),
      mediaQuery: cleanText(beat.mediaQuery || beat.imagePrompt, ""),
      durationSeconds: Number(beat.durationSeconds || 0) || undefined,
      startRatio: Number(beat.startRatio || 0) || undefined,
    });
  });
  return items;
};

const getGraphicMoments = (
  fact: WatchPsychologyInsight
): WatchPsychologyGraphicMoment[] => {
  const provided = (fact.graphicMoments || [])
    .filter(
      (moment) =>
        moment && (moment.headline || moment.highlight || moment.dataPoints?.length || moment.bullets?.length)
    )
    .map((moment) => ({
      kind: moment.kind || "stat-badge",
      startRatio: clamp(moment.startRatio ?? 0.42, 0.16, 0.78),
      durationSeconds: clamp(moment.durationSeconds ?? 4.8, 3.2, 7),
      ...moment,
    }));

  if (provided.length > 0) return provided.slice(0, 1);

  const label = cleanText(fact.label, "Psychology lens");
  const title = cleanText(fact.title, "Watch culture insight");

  if (fact.factType === "scarcity") {
    return [
      {
        kind: "bar-chart",
        startRatio: 0.46,
        durationSeconds: 4.8,
        headline: "Perceived value rises when access narrows",
        subhead: label,
        dataPoints: [
          { label: "urgency", value: 92, displayValue: "high" },
          { label: "status", value: 81, displayValue: "strong" },
          { label: "clarity", value: 37, displayValue: "mixed" },
        ],
      },
    ];
  }

  if (fact.factType === "ritual") {
    return [
      {
        kind: "timeline-card",
        startRatio: 0.44,
        durationSeconds: 4.6,
        headline: "Why ritual feels satisfying",
        subhead: label,
        bullets: [
          compactText("Repeatable physical action calms attention", 38),
          compactText(title, 44),
          compactText(fact.highlight || fact.body || "Small rituals create emotional order", 42),
        ],
      },
    ];
  }

  return [
    {
      kind: "stat-badge",
      startRatio: 0.42,
      durationSeconds: 4.4,
      headline: label,
      subhead: title,
      highlight: compactText(
        fact.highlight || fact.body || "The most revealing part is often the meaning, not the mechanism.",
        70
      ),
    },
  ];
};

const FilmTexture: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px), repeating-linear-gradient(0deg, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, transparent 1px, transparent 8px)",
      backgroundSize: "128px 100%, 100% 8px",
      opacity: 0.3,
      mixBlendMode: "screen",
    }}
  />
);

const BaseBackground: React.FC<{ accent?: string }> = ({ accent = BRASS }) => (
  <AbsoluteFill
    style={{
      backgroundColor: INK,
      backgroundImage: `radial-gradient(circle at 18% 16%, rgba(255,255,255,0.06), transparent 0 28%), linear-gradient(140deg, rgba(52,64,52,0.48), rgba(18,16,14,0.96) 44%, rgba(111,31,32,0.24)), linear-gradient(90deg, ${accent} 0 6px, transparent 6px 100%)`,
    }}
  >
    <FilmTexture />
  </AbsoluteFill>
);

const FadeWrap: React.FC<{ duration: number; children: React.ReactNode }> = ({
  duration,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, Math.max(24, duration - 24), duration],
    [1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const MediaLayer: React.FC<{
  media: WatchPsychologyMedia[];
  visualBeats?: WatchPsychologyBeat[];
  duration: number;
  ghostNumber?: string;
}> = ({ media, visualBeats, duration, ghostNumber }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beatItems = getBeatMediaItems(visualBeats);
  const renderItems = beatItems.length > 0 ? beatItems.map((item) => item.media) : media;

  if (renderItems.length === 0) {
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {ghostNumber ? (
          <div
            style={{
              color: "rgba(244,236,221,0.12)",
              fontFamily: "Georgia, Times New Roman, serif",
              fontSize: 230,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {ghostNumber}
          </div>
        ) : null}
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(circle at 70% 42%, rgba(201,161,90,0.16), transparent 0 20%, rgba(18,16,14,0.95) 46%)",
          }}
        />
      </AbsoluteFill>
    );
  }

  const segmentSpans = (() => {
    if (beatItems.length === 0) {
      const segmentFrames = Math.max(1, Math.ceil(duration / renderItems.length));
      return renderItems.map((_, index) =>
        index === renderItems.length - 1
          ? Math.max(1, duration - segmentFrames * index)
          : segmentFrames
      );
    }

    const rawFrames = beatItems.map((item) =>
      Math.max(1, Math.round((item.durationSeconds || 4) * fps))
    );
    const totalRawFrames = rawFrames.reduce((sum, value) => sum + value, 0) || 1;
    const spans = rawFrames.map((raw) =>
      Math.max(1, Math.round((raw / totalRawFrames) * duration))
    );

    let used = 0;
    return spans.map((span, index) => {
      if (index === spans.length - 1) return Math.max(1, duration - used);
      const remainingSlots = spans.length - index - 1;
      const maxAllowed = Math.max(1, duration - used - remainingSlots);
      const safeSpan = Math.max(1, Math.min(span, maxAllowed));
      used += safeSpan;
      return safeSpan;
    });
  })();

  const segmentStarts = segmentSpans.reduce<number[]>((acc, span, index) => {
    if (index === 0) {
      acc.push(0);
      return acc;
    }
    acc.push(acc[index - 1] + segmentSpans[index - 1]);
    return acc;
  }, []);

  return (
    <AbsoluteFill>
      {renderItems.map((item, index) => {
        const segmentStart = segmentStarts[index] || 0;
        const segmentSpan = Math.max(1, segmentSpans[index] || 1);
        const transitionFrames = Math.min(20, Math.max(4, Math.floor(segmentSpan * 0.18)));
        const start = Math.max(0, segmentStart - (index === 0 ? 0 : transitionFrames));
        const end = Math.min(
          duration,
          segmentStart + segmentSpan + (index === renderItems.length - 1 ? 0 : transitionFrames)
        );
        const span = Math.max(1, end - start);
        const localFrame = clamp(frame - start, 0, span);
        const opacity = interpolate(
          localFrame,
          [0, Math.min(transitionFrames, Math.floor(span / 3)), Math.max(transitionFrames, span - transitionFrames), span],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const scale = interpolate(localFrame, [0, span], [1.02, 1.08], {
          extrapolateRight: "clamp",
        });
        const drift = interpolate(localFrame, [0, span], [-14, 14], {
          extrapolateRight: "clamp",
        });
        const transform = `scale(${scale}) translate(${index % 2 === 0 ? drift : -drift}px, ${index % 3 === 0 ? drift * 0.3 : 0}px)`;

        return (
          <AbsoluteFill key={`${getMediaUrl(item)}-${index}`} style={{ opacity }}>
            {item.mediaType === "video" ? (
              <OffthreadVideo
                src={getMediaUrl(item)}
                volume={0}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.04) saturate(0.78) brightness(0.94)",
                  transform,
                }}
              />
            ) : (
              <Img
                src={getMediaUrl(item)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "sepia(0.12) contrast(1.08) saturate(0.84) brightness(0.96)",
                  transform,
                }}
              />
            )}
          </AbsoluteFill>
        );
      })}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(0deg, rgba(18,16,14,0.82) 0%, rgba(18,16,14,0.34) 38%, rgba(18,16,14,0.48) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const GraphicCard: React.FC<{
  moment: WatchPsychologyGraphicMoment;
  frame: number;
  start: number;
  duration: number;
}> = ({ moment, frame, start, duration }) => {
  const { fps } = useVideoConfig();
  const localFrame = frame - start;
  const enterFrames = Math.max(12, Math.round(fps * 0.45));
  const exitFrames = Math.max(12, Math.round(fps * 0.38));
  const enter = interpolate(localFrame, [0, enterFrames], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    localFrame,
    [Math.max(0, duration - exitFrames), duration],
    [0, 1],
    {
      easing: Easing.in(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const opacity = enter * (1 - exit);
  const slide = interpolate(enter, [0, 1], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(enter, [0, 1], [0.965, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const kind = moment.kind || "stat-badge";
  const headline = cleanText(moment.headline, "Psychology lens");
  const subhead = cleanText(moment.subhead, "");
  const headlineLines = splitLines(headline, 22, 3);
  const headlineSize =
    headlineLines.length >= 3 ? 28 : headlineLines.length === 2 ? 32 : 36;
  const subheadLines = subhead ? splitLines(subhead, 38, 3) : [];
  const bullets = (moment.bullets || [])
    .map((bullet) => cleanText(bullet))
    .filter(Boolean)
    .slice(0, 3);
  const points = (moment.dataPoints || [])
    .map((point) => ({
      label: cleanText(point.label, "item"),
      value: clamp(Number(point.value || 0), 0, 100),
      displayValue: cleanText(point.displayValue, ""),
    }))
    .filter((point) => point.label)
    .slice(0, 4);

  if (opacity <= 0.001) return null;

  return (
    <AbsoluteFill
      style={{
        alignItems: "flex-end",
        justifyContent: "flex-start",
        paddingTop: 154,
        paddingRight: 82,
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          width: 460,
          backgroundColor: "rgba(18,16,14,0.72)",
          border: `2px solid ${BRASS}`,
          borderRadius: 18,
          padding: "22px 24px",
          boxShadow: "0 22px 54px rgba(0,0,0,0.4)",
          transform: `translateY(${slide}px) scale(${scale})`,
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            color: BRASS,
            fontSize: 16,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {kind === "bar-chart"
            ? "Behavior curve"
            : kind === "timeline-card"
              ? "Emotional arc"
              : "Signal snapshot"}
        </div>
        <div
          style={{
            color: PAPER,
            fontFamily: "Georgia, Times New Roman, serif",
            fontSize: headlineSize,
            lineHeight: 1.08,
            marginTop: 14,
          }}
        >
          {headlineLines.map((line, index) => (
            <div key={`${line}-${index}`}>{line}</div>
          ))}
        </div>
        {subhead ? (
          <div
            style={{
              color: "rgba(244,236,221,0.72)",
              fontSize: 17,
              lineHeight: 1.28,
              marginTop: 10,
              fontWeight: 700,
            }}
          >
            {subheadLines.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
        ) : null}
        <div
          style={{
            width: 138,
            height: 4,
            backgroundColor: OXBLOOD,
            marginTop: 18,
            marginBottom: 18,
          }}
        />
        {kind === "bar-chart" ? (
          <div style={{ display: "grid", gap: 14 }}>
            {points.map((point, index) => (
              <div key={`${point.label}-${index}`}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "rgba(244,236,221,0.84)",
                    fontSize: 17,
                    fontWeight: 700,
                    marginBottom: 7,
                  }}
                >
                  <span>{truncate(point.label, 22)}</span>
                  <span>{point.displayValue || `${Math.round(point.value)}`}</span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: "rgba(244,236,221,0.12)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${point.value}%`,
                      height: "100%",
                      borderRadius: 999,
                      background:
                        index % 2 === 0
                          ? `linear-gradient(90deg, ${BRASS}, ${OXBLOOD})`
                          : `linear-gradient(90deg, ${OLIVE}, ${BRASS})`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {kind === "timeline-card" ? (
          <div style={{ display: "grid", gap: 14 }}>
            {bullets.map((bullet, index) => (
              <div
                key={`${bullet}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "22px 1fr",
                  gap: 14,
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: index === 1 ? OXBLOOD : BRASS,
                    marginTop: 6,
                    boxShadow: "0 0 0 5px rgba(244,236,221,0.08)",
                  }}
                />
                <div
                  style={{
                    color: "rgba(244,236,221,0.88)",
                    fontSize: 20,
                    lineHeight: 1.28,
                    fontWeight: 700,
                  }}
                >
                  {splitLines(bullet, 30, 3).map((line, lineIndex) => (
                    <div key={`${line}-${lineIndex}`}>{line}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {kind === "stat-badge" ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                color: PAPER,
                fontSize:
                  splitLines(
                    cleanText(
                      moment.highlight,
                      "The strongest signal is often emotional, not technical."
                    ),
                    34,
                    4
                  ).length > 3
                    ? 22
                    : 25,
                lineHeight: 1.24,
                fontWeight: 700,
              }}
            >
              {splitLines(
                cleanText(
                  moment.highlight,
                  "The strongest signal is often emotional, not technical."
                ),
                34,
                4
              ).map((line, index) => (
                <div key={`${line}-${index}`}>{line}</div>
              ))}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                color: BRASS,
                fontSize: 15,
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: OXBLOOD,
                }}
              />
              Insight overlay
            </div>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const GraphicLayer: React.FC<{
  fact: WatchPsychologyInsight;
  duration: number;
}> = ({ fact, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const moments = getGraphicMoments(fact);

  return (
    <>
      {moments.map((moment, index) => {
        const momentFrames = Math.max(fps * 3, Math.round((moment.durationSeconds || 4.8) * fps));
        const start = Math.min(
          Math.max(fps * 5, Math.round(duration * clamp(moment.startRatio ?? 0.42, 0.14, 0.8))),
          Math.max(0, duration - momentFrames - fps)
        );

        return (
          <GraphicCard
            key={`${moment.headline || "graphic"}-${index}`}
            moment={moment}
            frame={frame}
            start={start}
            duration={Math.min(momentFrames, Math.max(1, duration - start))}
          />
        );
      })}
    </>
  );
};

const ProgressRail: React.FC<{ total: number; activeIndex: number }> = ({
  total,
  activeIndex,
}) => {
  const displayCount = Math.max(1, Math.min(total, 16));
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${displayCount}, minmax(0, 1fr))`,
        gap: 6,
        width: 520,
      }}
    >
      {Array.from({ length: displayCount }).map((_, index) => (
        <div
          key={index}
          style={{
            height: 6,
            borderRadius: 999,
            backgroundColor:
              index < activeIndex
                ? BRASS
                : index === activeIndex
                  ? OXBLOOD
                  : "rgba(244,236,221,0.14)",
            boxShadow:
              index === activeIndex ? "0 0 18px rgba(111,31,32,0.45)" : "none",
          }}
        />
      ))}
    </div>
  );
};

const IntroScene: React.FC<{
  props: WatchPsychologyProps;
  duration: number;
  totalFacts: number;
}> = ({ props, duration, totalFacts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioUrl = getAudioUrl(props.intro);
  const title = cleanText(props.title, watchPsychologyDefaultProps.title);
  const subtitle = cleanText(props.subtitle, watchPsychologyDefaultProps.subtitle);
  const eyebrow = cleanText(props.intro?.eyebrow, "Watch Psychology");
  const cardIn = spring({
    frame,
    fps,
    config: { stiffness: 70, damping: 18 },
  });
  const overlayOpacity = getOverlayOpacity(frame, duration, fps * 7, 16);
  const lineWidth = interpolate(frame, [14, 62], [0, 460], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateRight: "clamp",
  });
  const media = getMediaItems(props.intro);
  const titleLines = splitLines(title, 24, 3);
  const subtitleLines = splitLines(subtitle, 48, 3);
  const titleSize =
    titleLines.length >= 3 ? 52 : titleLines.length === 2 ? 60 : 68;
  const subtitleSize = subtitleLines.length >= 3 ? 24 : 28;

  return (
    <FadeWrap duration={duration}>
      <BaseBackground />
      <MediaLayer media={media} visualBeats={props.intro?.visualBeats} duration={duration} />
      {audioUrl ? <Audio src={audioUrl} /> : null}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          padding: "0 110px",
          opacity: overlayOpacity,
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: 960,
            backgroundColor: "rgba(14,12,10,0.64)",
            border: `1px solid rgba(201,161,90,0.74)`,
            borderRadius: 18,
            padding: "34px 38px 30px 38px",
            boxShadow: "0 22px 56px rgba(0,0,0,0.46)",
            transform: `translateY(${(1 - cardIn) * 34}px) scale(${0.97 + cardIn * 0.03})`,
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              color: BRASS,
              fontSize: 24,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              color: PAPER,
              fontFamily: "Georgia, Times New Roman, serif",
              fontSize: titleSize,
              lineHeight: 1.04,
              marginTop: 18,
              maxWidth: 840,
            }}
          >
            {titleLines.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
          <div
            style={{
              width: lineWidth,
              height: 5,
              backgroundColor: OXBLOOD,
              marginTop: 28,
              marginBottom: 24,
            }}
          />
          <div
            style={{
              color: "rgba(244,236,221,0.88)",
              fontSize: subtitleSize,
              lineHeight: 1.34,
              fontWeight: 600,
              maxWidth: 760,
            }}
          >
            {subtitleLines.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 30,
              gap: 28,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "rgba(244,236,221,0.62)",
                fontSize: 19,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.3,
              }}
            >
              {totalFacts} insight chapters / slow-burn editorial pacing
            </div>
            <ProgressRail total={totalFacts} activeIndex={0} />
          </div>
        </div>
      </AbsoluteFill>
    </FadeWrap>
  );
};

const InsightScene: React.FC<{
  fact: WatchPsychologyInsight;
  index: number;
  total: number;
  duration: number;
  category?: string;
}> = ({ fact, index, total, duration, category }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioUrl = getAudioUrl(fact);
  const media = getMediaItems(fact);
  const overlayOpacity = getOverlayOpacity(frame, duration, fps * 8, 18);
  const cardEnter = interpolate(frame, [0, 20], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glow = 0.82 + Math.sin(frame * 0.05) * 0.05;
  const label = cleanText(fact.label, fact.factType ? `${fact.factType} insight` : "watch culture insight");
  const titleLines = splitLines(cleanText(fact.title, "Watch psychology insight"), 26, 3);
  const bodyLines = splitLines(cleanText(fact.body, ""), 46, 4);
  const highlight = cleanText(fact.highlight, "");
  const number = String(fact.number || index + 1).padStart(2, "0");
  const titleSize =
    titleLines.length >= 3 ? 46 : titleLines.length === 2 ? 52 : 58;
  const bodySize = bodyLines.length >= 4 ? 24 : 27;
  const highlightLines = highlight ? splitLines(highlight, 24, 4) : [];
  const highlightSize = highlightLines.length >= 4 ? 18 : highlightLines.length >= 3 ? 20 : 22;
  const categoryLabel = truncate(cleanText(category, "Watch Psychology"), 24);

  return (
    <FadeWrap duration={duration}>
      <BaseBackground accent={index % 2 === 0 ? BRASS : OLIVE} />
      <MediaLayer media={media} visualBeats={fact.visualBeats} duration={duration} ghostNumber={number} />
      {audioUrl ? <Audio src={audioUrl} /> : null}
      <GraphicLayer fact={fact} duration={duration} />

      <AbsoluteFill
        style={{
          justifyContent: "space-between",
          padding: "58px 76px 64px 76px",
          opacity: overlayOpacity,
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 82,
                height: 82,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, rgba(244,236,221,${0.22 * glow}), ${OXBLOOD})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: PAPER,
                fontFamily: "Georgia, Times New Roman, serif",
                fontSize: 38,
                fontWeight: 700,
                boxShadow: "0 12px 28px rgba(0,0,0,0.34)",
              }}
            >
              {number}
            </div>
            <div>
              <div
                style={{
                  color: BRASS,
                  fontSize: 17,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {truncate(label, 28)}
              </div>
              <div
                style={{
                  color: "rgba(244,236,221,0.66)",
                  fontSize: 17,
                  fontWeight: 700,
                  marginTop: 6,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {number} / {String(total).padStart(2, "0")} / {categoryLabel}
              </div>
            </div>
          </div>

          <ProgressRail total={total} activeIndex={index + 1} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 46,
          }}
        >
          <div
            style={{
              width: 980,
              backgroundColor: "rgba(14,12,10,0.64)",
              border: `1px solid rgba(201,161,90,0.72)`,
              borderRadius: 20,
              padding: "30px 34px 28px 34px",
              boxShadow: "0 24px 58px rgba(0,0,0,0.46)",
              transform: `translateY(${(1 - cardEnter) * 24}px) scale(${0.975 + cardEnter * 0.025})`,
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: PAPER,
                fontFamily: "Georgia, Times New Roman, serif",
                fontSize: titleSize,
                lineHeight: 1.04,
                textShadow: "0 6px 24px rgba(0,0,0,0.32)",
              }}
            >
              {titleLines.map((line, lineIndex) => (
                <div key={`${line}-${lineIndex}`}>{line}</div>
              ))}
            </div>
            <div
              style={{
                width: 360,
                height: 5,
                backgroundColor: OXBLOOD,
                marginTop: 24,
                marginBottom: 24,
              }}
            />
            <div
              style={{
                color: "rgba(244,236,221,0.9)",
                fontSize: bodySize,
                lineHeight: 1.34,
                fontWeight: 600,
                maxWidth: 840,
              }}
            >
              {bodyLines.map((line, lineIndex) => (
                <div key={`${line}-${lineIndex}`}>{line}</div>
              ))}
            </div>
          </div>

          {highlight ? (
            <div
              style={{
                width: 330,
                backgroundColor: "rgba(14,12,10,0.58)",
                border: "1px solid rgba(244,236,221,0.18)",
                borderRadius: 18,
                padding: "22px 24px",
                boxShadow: "0 18px 48px rgba(0,0,0,0.28)",
                transform: `translateY(${(1 - cardEnter) * 18}px)`,
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                style={{
                  color: BRASS,
                  fontSize: 15,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Psychology lens
              </div>
              <div
                style={{
                  color: PAPER,
                  fontSize: highlightSize,
                  lineHeight: 1.26,
                  fontWeight: 700,
                  marginTop: 14,
                }}
              >
                {highlightLines.map((line, lineIndex) => (
                  <div key={`${line}-${lineIndex}`}>{line}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </FadeWrap>
  );
};

const OutroScene: React.FC<{
  props: WatchPsychologyProps;
  duration: number;
}> = ({ props, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioUrl = getAudioUrl(props.outro);
  const media = getMediaItems(props.outro);
  const title = cleanText(props.outro?.title, "The watch says something before you do");
  const body = cleanText(
    props.outro?.body,
    "The psychological power of watches lives in ritual, recognition, and the stories people attach to them."
  );
  const titleLines = splitLines(title, 28, 3);
  const bodyLines = splitLines(body, 48, 4);
  const titleSize =
    titleLines.length >= 3 ? 48 : titleLines.length === 2 ? 56 : 64;
  const bodySize = bodyLines.length >= 4 ? 24 : 28;
  const scale = spring({
    frame,
    fps,
    config: { stiffness: 54, damping: 18 },
  });

  return (
    <FadeWrap duration={duration}>
      <BaseBackground accent={OXBLOOD} />
      <MediaLayer media={media} visualBeats={props.outro?.visualBeats} duration={duration} />
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
            width: 1040,
            maxWidth: "100%",
            backgroundColor: "rgba(14,12,10,0.62)",
            border: `1px solid rgba(201,161,90,0.7)`,
            borderRadius: 20,
            padding: "34px 42px 30px 42px",
            boxShadow: "0 22px 56px rgba(0,0,0,0.42)",
            backdropFilter: "blur(10px)",
            transform: `scale(${0.97 + scale * 0.03})`,
          }}
        >
          <div
            style={{
              color: BRASS,
              fontSize: 18,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            Closing thought
          </div>
          <div
            style={{
              color: PAPER,
              fontFamily: "Georgia, Times New Roman, serif",
              fontSize: titleSize,
              lineHeight: 1.08,
              marginTop: 18,
              maxWidth: 900,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {titleLines.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
          <div
            style={{
              width: 320,
              height: 5,
              backgroundColor: OXBLOOD,
              marginTop: 24,
              marginBottom: 24,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          />
          <div
            style={{
              color: "rgba(244,236,221,0.84)",
              fontSize: bodySize,
              lineHeight: 1.34,
              maxWidth: 860,
              fontWeight: 600,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {bodyLines.map((line, index) => (
              <div key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </FadeWrap>
  );
};

export const WatchPsychology: React.FC<WatchPsychologyProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  const mergedProps: WatchPsychologyProps = {
    ...watchPsychologyDefaultProps,
    ...props,
    intro: { ...watchPsychologyDefaultProps.intro, ...props.intro },
    outro: { ...watchPsychologyDefaultProps.outro, ...props.outro },
    facts:
      props.facts && props.facts.length > 0
        ? props.facts
        : watchPsychologyDefaultProps.facts,
  };
  const timeline = buildTimeline(mergedProps, fps);
  const musicUrl = cleanText(mergedProps.backgroundMusicUrl, "");

  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {musicUrl ? (
        <Audio
          src={musicUrl}
          loop
          volume={(frame) => {
            const fadeIn = interpolate(frame, [0, 60], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const fadeOut = interpolate(
              frame,
              [durationInFrames - 60, durationInFrames],
              [1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            return 0.09 * Math.min(fadeIn, fadeOut);
          }}
        />
      ) : null}

      {timeline.sections.map((section) => {
        if (section.type === "intro") {
          return (
            <Sequence
              key="intro"
              from={section.from}
              durationInFrames={section.duration}
              premountFor={fps}
            >
              <IntroScene props={mergedProps} duration={section.duration} totalFacts={timeline.facts.length} />
            </Sequence>
          );
        }

        if (section.type === "outro") {
          return (
            <Sequence
              key="outro"
              from={section.from}
              durationInFrames={section.duration}
              premountFor={fps}
            >
              <OutroScene props={mergedProps} duration={section.duration} />
            </Sequence>
          );
        }

        return (
          <Sequence
            key={`fact-${section.index}`}
            from={section.from}
            durationInFrames={section.duration}
            premountFor={fps}
          >
            <InsightScene
              fact={section.fact || {}}
              index={section.index || 0}
              total={timeline.facts.length}
              duration={section.duration}
              category={mergedProps.category}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
