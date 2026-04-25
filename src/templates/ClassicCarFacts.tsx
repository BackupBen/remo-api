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

export interface FactListMedia {
  mediaType?: "image" | "video";
  mediaUrl?: string | null;
  url?: string | null;
  src?: string | null;
  sourceUrl?: string | null;
  credit?: string | null;
}

export interface FactListSection {
  eyebrow?: string;
  title?: string;
  body?: string;
  voiceover?: string;
  durationSeconds?: number;
  voiceoverDurationSeconds?: number;
  audioDurationSeconds?: number;
  voiceoverUrl?: string;
  audioUrl?: string;
  media?: FactListMedia[];
}

export interface FactGraphicPoint {
  label?: string;
  value?: number;
  displayValue?: string;
}

export interface FactGraphicMoment {
  kind?: "stat-badge" | "bar-chart" | "timeline-card";
  startRatio?: number;
  durationSeconds?: number;
  headline?: string;
  subhead?: string;
  highlight?: string;
  bullets?: string[];
  dataPoints?: FactGraphicPoint[];
}

export interface FactListItem extends FactListSection {
  number?: number;
  label?: string;
  factType?: "surprising" | "engineering" | "culture" | "market";
  highlight?: string;
  graphicMoments?: FactGraphicMoment[];
}

export interface ClassicCarFactsProps {
  title?: string;
  subtitle?: string;
  category?: string;
  intro?: FactListSection;
  facts?: FactListItem[];
  outro?: FactListSection;
  backgroundMusicUrl?: string;
}

type SectionTiming = {
  type: "intro" | "fact" | "outro";
  from: number;
  duration: number;
  fact?: FactListItem;
  index?: number;
};

const FPS = 30;
const MIN_SECTION_FRAMES = 45;
const DEFAULT_INTRO_SECONDS = 16;
const DEFAULT_FACT_SECONDS = 16;
const DEFAULT_OUTRO_SECONDS = 12;
const GOLD = "#d5a33a";
const RED = "#9f312f";
const GREEN = "#1e5645";
const PAPER = "#f1ead9";
const INK = "#11100e";

const sampleBritishFacts: FactListItem[] = [
  {
    number: 1,
    title: "British roadsters were engineered for export first",
    body: "Many compact British sports cars survived because American buyers wanted affordable open-top fun.",
    label: "Export story",
    factType: "market",
  },
  {
    number: 2,
    title: "Wire wheels often sold the dream more than the performance",
    body: "They looked expensive and elegant, even when the rest of the car stayed mechanically simple.",
    label: "Design detail",
    factType: "culture",
  },
  {
    number: 3,
    title: "Lucas electrics became a running joke worldwide",
    body: "The stereotype stuck so deeply that it became part of classic British car folklore.",
    label: "Workshop folklore",
    factType: "culture",
  },
  {
    number: 4,
    title: "A tiny cabin was often a deliberate packaging compromise",
    body: "Designers kept dimensions tight to save weight, sharpen handling, and reduce manufacturing cost.",
    label: "Engineering trade-off",
    factType: "engineering",
  },
  {
    number: 5,
    title: "Overdrive transformed motorway manners",
    body: "A humble mechanical add-on could make an old British car feel dramatically calmer at speed.",
    label: "Driving feel",
    factType: "engineering",
  },
  {
    number: 6,
    title: "Several famous marques shared parts behind the romance",
    body: "Switchgear, engines, and suspension pieces often crossed between models to keep costs under control.",
    label: "Shared hardware",
    factType: "market",
  },
  {
    number: 7,
    title: "British green was never just one color",
    body: "The racing heritage shade exists in many interpretations, from almost black to bright metallic tones.",
    label: "Color myth",
    factType: "culture",
  },
  {
    number: 8,
    title: "Wood-rim steering wheels were part theater, part temperature control",
    body: "They looked premium and could feel friendlier in the hand than bare metal rims.",
    label: "Cockpit note",
    factType: "surprising",
  },
  {
    number: 9,
    title: "A live rear axle stayed longer than many buyers expected",
    body: "British makers often refined old layouts for years instead of rushing into expensive new hardware.",
    label: "Old-school engineering",
    factType: "engineering",
  },
  {
    number: 10,
    title: "Many classics owed their charm to flexible engines, not huge power",
    body: "Usable torque and light weight mattered more than headline horsepower on ordinary roads.",
    label: "Power reality",
    factType: "surprising",
  },
  {
    number: 11,
    title: "Some British coupes were basically dressed-up family car platforms",
    body: "The glamorous body often hid practical roots and surprisingly ordinary mechanical architecture.",
    label: "Hidden origins",
    factType: "surprising",
  },
  {
    number: 12,
    title: "Convertibles sometimes gained reputation from films more than race results",
    body: "Pop culture could elevate a model’s status far beyond what its numbers suggested.",
    label: "Screen legend",
    factType: "culture",
  },
  {
    number: 13,
    title: "Chrome bumpers became a visual dividing line for collectors",
    body: "Small regulation changes created entire generations of preference in the classic market.",
    label: "Collector bias",
    factType: "market",
  },
  {
    number: 14,
    title: "Rust, not mileage, often decided survival",
    body: "A low-mileage British classic could be far worse than a heavily used car stored properly.",
    label: "Ownership truth",
    factType: "surprising",
  },
  {
    number: 15,
    title: "A good gear lever feel became part of the national identity",
    body: "Even modest cars earned praise when the shift action felt direct, light, and mechanical.",
    label: "Driver connection",
    factType: "engineering",
  },
  {
    number: 16,
    title: "British sports cars helped sell an entire lifestyle abroad",
    body: "Manufacturers exported weather, freedom, and optimism almost as much as the car itself.",
    label: "Brand image",
    factType: "culture",
  },
  {
    number: 17,
    title: "A badge could change the story of the same basic car",
    body: "Trim, tuning, and marketing often created separate identities from closely related machines.",
    label: "Badge engineering",
    factType: "market",
  },
  {
    number: 18,
    title: "British classics reward momentum more than brute force",
    body: "They often feel best when driven fluently rather than aggressively.",
    label: "Road character",
    factType: "engineering",
  },
  {
    number: 19,
    title: "Owners became part-time historians by necessity",
    body: "Trim codes, production changes, and tiny revisions matter far more than many newcomers expect.",
    label: "Ownership culture",
    factType: "culture",
  },
  {
    number: 20,
    title: "The imperfections are part of the appeal",
    body: "Classic British cars often win hearts because they feel handmade, human, and faintly stubborn.",
    label: "Lasting appeal",
    factType: "surprising",
  },
];

export const classicCarFactsDefaultProps: ClassicCarFactsProps = {
  title: "20 Facts About Classic British Cars You Didn't Know",
  subtitle: "The myths, engineering quirks, and market stories behind the icons",
  category: "Classic British Cars",
  intro: {
    eyebrow: "Fact File",
    title: "Twenty facts that make the legends feel more human",
    body: "From export strategy to workshop folklore, these details reveal why classic British cars remain so memorable.",
    voiceover:
      "Classic British cars are full of stories that sit somewhere between engineering, image, and pure character. Here are twenty facts that make the legends feel more human.",
    durationSeconds: 16,
  },
  facts: sampleBritishFacts,
  outro: {
    eyebrow: "Closing thought",
    title: "The surprises are part of the charm",
    body: "These cars were never only about numbers. Their appeal lives in the details, contradictions, and personalities they carry.",
    voiceover:
      "That is the magic of these classics. The facts only make them more interesting, because the charm was never about perfection alone.",
    durationSeconds: 12,
  },
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(max, Math.max(min, value));
};

const secondsToFrames = (seconds: number | undefined, fps: number) => {
  return Math.max(MIN_SECTION_FRAMES, Math.round((seconds || 0) * fps));
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
    clipped[clipped.length - 1] = `${truncate(clipped[clipped.length - 1], Math.max(12, maxCharsPerLine - 4)).replace(/\.\.\.$/, "")}...`;
  }

  return clipped.length > 0 ? clipped : [""];
};

const compactFactText = (value: string, maxLength = 56) => {
  return truncate(
    value
      .replace(/\s+/g, " ")
      .replace(/\.$/, "")
      .trim(),
    maxLength
  );
};

const getMediaUrl = (media?: FactListMedia | null) => {
  return media?.mediaUrl || media?.url || media?.src || "";
};

const getAudioUrl = (section?: {
  voiceoverUrl?: string;
  audioUrl?: string;
}) => {
  return section?.voiceoverUrl || section?.audioUrl || "";
};

const getSectionSeconds = (section?: {
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

const buildFactTimeline = (props: ClassicCarFactsProps, fps = FPS) => {
  const facts = (props.facts && props.facts.length > 0
    ? props.facts
    : classicCarFactsDefaultProps.facts || []) as FactListItem[];
  const sections: SectionTiming[] = [];
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
    sections.push({
      type: "fact",
      from: cursor,
      duration: factDuration,
      fact,
      index,
    });
    cursor += factDuration;
  });

  const outroDuration = secondsToFrames(
    getSectionSeconds(props.outro) || DEFAULT_OUTRO_SECONDS,
    fps
  );
  sections.push({ type: "outro", from: cursor, duration: outroDuration });
  cursor += outroDuration;

  return {
    facts,
    sections,
    totalFrames: Math.max(cursor, MIN_SECTION_FRAMES),
  };
};

export const getClassicCarFactsDurationInFrames = (
  props: ClassicCarFactsProps,
  fps = FPS
) => {
  return buildFactTimeline(props, fps).totalFrames;
};

const getFactGraphicMoments = (fact: FactListItem): FactGraphicMoment[] => {
  const provided = (fact.graphicMoments || [])
    .filter((moment) => moment && (moment.headline || moment.highlight || moment.dataPoints?.length || moment.bullets?.length))
    .map((moment) => ({
      kind: moment.kind || "stat-badge",
      startRatio: clamp(moment.startRatio ?? 0.42, 0.16, 0.78),
      durationSeconds: clamp(moment.durationSeconds ?? 4.8, 3.2, 7),
      ...moment,
    }));

  if (provided.length > 0) {
    return provided.slice(0, 1);
  }

  const title = cleanText(fact.title, "Interesting classic car fact");
  const label = cleanText(fact.label, "fact");

  if (fact.factType === "engineering") {
    return [
      {
        kind: "timeline-card",
        startRatio: 0.46,
        durationSeconds: 4.6,
        headline: "Engineering angle",
        subhead: label,
        bullets: [
          compactFactText(title, 34),
          compactFactText(fact.body || "", 40),
          compactFactText(fact.highlight || "A small detail that changed the driving feel", 36),
        ],
      },
    ];
  }

  if (fact.factType === "market") {
    return [
      {
        kind: "bar-chart",
        startRatio: 0.44,
        durationSeconds: 4.8,
        headline: "Market signal",
        subhead: label,
        dataPoints: [
          { label: "appeal", value: 88, displayValue: "high" },
          { label: "rarity", value: 54, displayValue: "mid" },
          { label: "impact", value: 74, displayValue: "strong" },
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
      highlight: compactFactText(fact.highlight || fact.body || "A small detail that says a lot", 62),
    },
  ];
};

const FilmTexture: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px), repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 9px)",
      backgroundSize: "132px 100%, 100% 9px",
      opacity: 0.28,
    }}
  />
);

const BaseBackground: React.FC<{ accent?: string }> = ({ accent = GOLD }) => (
  <AbsoluteFill
    style={{
      backgroundColor: INK,
      backgroundImage: `linear-gradient(140deg, rgba(30,86,69,0.72), rgba(17,16,14,0.95) 44%, rgba(159,49,47,0.24)), linear-gradient(90deg, ${accent} 0 8px, transparent 8px 100%)`,
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

const getMediaItems = (section?: FactListSection | FactListItem) => {
  const seen = new Set<string>();
  const items: FactListMedia[] = [];

  (section?.media || []).forEach((media) => {
    const url = getMediaUrl(media);
    if (!url || seen.has(url)) {
      return;
    }
    seen.add(url);
    items.push({
      mediaType: media.mediaType || "image",
      ...media,
      mediaUrl: url,
    });
  });

  return items.slice(0, 6);
};

const MediaLayer: React.FC<{
  media: FactListMedia[];
  duration: number;
  ghostNumber?: string;
}> = ({ media, duration, ghostNumber }) => {
  const frame = useCurrentFrame();

  if (media.length === 0) {
    return (
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {ghostNumber ? (
          <div
            style={{
              color: "rgba(242,234,216,0.14)",
              fontFamily: "Georgia, Times New Roman, serif",
              fontSize: 240,
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
              "radial-gradient(circle at 68% 40%, rgba(213,163,58,0.14), transparent 0 20%, rgba(17,16,14,0.95) 46%)",
          }}
        />
      </AbsoluteFill>
    );
  }

  const segmentFrames = Math.max(1, Math.ceil(duration / media.length));
  const transitionFrames = Math.min(24, Math.max(4, Math.floor(segmentFrames * 0.18)));

  return (
    <AbsoluteFill>
      {media.map((item, index) => {
        const start = Math.max(0, index * segmentFrames - (index === 0 ? 0 : transitionFrames));
        const end = Math.min(duration, (index + 1) * segmentFrames + transitionFrames);
        const span = Math.max(1, end - start);
        const localFrame = clamp(frame - start, 0, span);
        const opacity = interpolate(
          localFrame,
          [0, Math.min(transitionFrames, Math.floor(span / 3)), Math.max(transitionFrames, span - transitionFrames), span],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const scale = interpolate(localFrame, [0, span], [1.03, 1.1], {
          extrapolateRight: "clamp",
        });
        const drift = interpolate(localFrame, [0, span], [-18, 18], {
          extrapolateRight: "clamp",
        });
        const transform = `scale(${scale}) translate(${index % 2 === 0 ? drift : -drift}px, ${index % 3 === 0 ? drift * 0.35 : 0}px)`;

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
                  filter: "contrast(1.08) saturate(0.9) brightness(0.92)",
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
                  filter: "sepia(0.18) contrast(1.08) saturate(0.82) brightness(0.94)",
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
            "linear-gradient(0deg, rgba(17,16,14,0.78) 0%, rgba(17,16,14,0.28) 38%, rgba(17,16,14,0.42) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const FactGraphicCard: React.FC<{
  moment: FactGraphicMoment;
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
  const slide = interpolate(enter, [0, 1], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(enter, [0, 1], [0.96, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const kind = moment.kind || "stat-badge";
  const headline = cleanText(moment.headline, "Quick note");
  const subhead = cleanText(moment.subhead, "");
  const bullets = (moment.bullets || []).map((bullet) => cleanText(bullet)).filter(Boolean).slice(0, 3);
  const points = (moment.dataPoints || [])
    .map((point) => ({
      label: cleanText(point.label, "item"),
      value: clamp(Number(point.value || 0), 0, 100),
      displayValue: cleanText(point.displayValue, ""),
    }))
    .filter((point) => point.label)
    .slice(0, 4);

  if (opacity <= 0.001) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        alignItems: "flex-end",
        justifyContent: "flex-start",
        paddingTop: 168,
        paddingRight: 82,
        pointerEvents: "none",
        opacity,
      }}
    >
      <div
        style={{
          width: 470,
          backgroundColor: "rgba(17,16,14,0.7)",
          border: `2px solid ${GOLD}`,
          borderRadius: 18,
          padding: "24px 26px 24px 26px",
          boxShadow: "0 24px 58px rgba(0,0,0,0.4)",
          transform: `translateY(${slide}px) scale(${scale})`,
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            color: GOLD,
            fontSize: 18,
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          {kind === "bar-chart"
            ? "Graphic comparison"
            : kind === "timeline-card"
              ? "Timeline note"
              : "Graphic callout"}
        </div>
        <div
          style={{
            color: PAPER,
            fontFamily: "Georgia, Times New Roman, serif",
            fontSize: 36,
            lineHeight: 1.08,
            marginTop: 14,
          }}
        >
          {truncate(headline, 44)}
        </div>
        {subhead ? (
          <div
            style={{
              color: "rgba(241,234,217,0.74)",
              fontSize: 18,
              lineHeight: 1.3,
              marginTop: 10,
              fontWeight: 700,
            }}
          >
            {truncate(subhead, 62)}
          </div>
        ) : null}
        <div
          style={{
            width: 140,
            height: 4,
            backgroundColor: RED,
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
                    color: "rgba(241,234,217,0.84)",
                    fontSize: 17,
                    fontWeight: 700,
                    marginBottom: 7,
                  }}
                >
                  <span>{truncate(point.label, 20)}</span>
                  <span>{point.displayValue || `${Math.round(point.value)}`}</span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: "rgba(241,234,217,0.12)",
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
                          ? `linear-gradient(90deg, ${GOLD}, ${RED})`
                          : `linear-gradient(90deg, ${GREEN}, ${GOLD})`,
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
                    backgroundColor: index === 1 ? RED : GOLD,
                    marginTop: 6,
                    boxShadow: "0 0 0 5px rgba(241,234,217,0.08)",
                  }}
                />
                <div
                  style={{
                    color: "rgba(241,234,217,0.88)",
                    fontSize: 22,
                    lineHeight: 1.28,
                    fontWeight: 700,
                  }}
                >
                  {truncate(bullet, 74)}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {kind === "stat-badge" ? (
          <div
            style={{
              display: "grid",
              gap: 12,
            }}
          >
            <div
              style={{
                color: PAPER,
                fontSize: 28,
                lineHeight: 1.28,
                fontWeight: 700,
              }}
            >
              {truncate(cleanText(moment.highlight, "Small details often reshape how we remember a car."), 118)}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                color: GOLD,
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
                  backgroundColor: RED,
                }}
              />
              Fact overlay
            </div>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

const FactGraphicLayer: React.FC<{
  fact: FactListItem;
  duration: number;
}> = ({ fact, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const moments = getFactGraphicMoments(fact);

  return (
    <>
      {moments.map((moment, index) => {
        const momentFrames = Math.max(
          fps * 3,
          Math.round((moment.durationSeconds || 4.8) * fps)
        );
        const start = Math.min(
          Math.max(fps * 5, Math.round(duration * clamp(moment.startRatio ?? 0.42, 0.14, 0.8))),
          Math.max(0, duration - momentFrames - fps)
        );

        return (
          <FactGraphicCard
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

const ProgressRail: React.FC<{
  total: number;
  activeIndex: number;
}> = ({ total, activeIndex }) => {
  const displayCount = Math.max(1, Math.min(total, 20));

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
                ? GOLD
                : index === activeIndex
                  ? RED
                  : "rgba(241,234,217,0.14)",
            boxShadow:
              index === activeIndex ? "0 0 18px rgba(159,49,47,0.45)" : "none",
          }}
        />
      ))}
    </div>
  );
};

const IntroScene: React.FC<{
  props: ClassicCarFactsProps;
  duration: number;
  totalFacts: number;
}> = ({ props, duration, totalFacts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioUrl = getAudioUrl(props.intro);
  const title = cleanText(props.title, classicCarFactsDefaultProps.title);
  const subtitle = cleanText(props.subtitle, classicCarFactsDefaultProps.subtitle);
  const eyebrow = cleanText(props.intro?.eyebrow, "Fact File");
  const cardIn = spring({
    frame,
    fps,
    config: { stiffness: 70, damping: 18 },
  });
  const overlayOpacity = getOverlayOpacity(frame, duration, fps * 7, 16);
  const lineWidth = interpolate(frame, [14, 62], [0, 440], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateRight: "clamp",
  });
  const media = getMediaItems(props.intro);

  return (
    <FadeWrap duration={duration}>
      <BaseBackground />
      <MediaLayer media={media} duration={duration} />
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
            width: 950,
            backgroundColor: "rgba(17,16,14,0.54)",
            border: `2px solid ${GOLD}`,
            borderRadius: 18,
            padding: "34px 38px 32px 38px",
            boxShadow: "0 22px 56px rgba(0,0,0,0.4)",
            transform: `translateY(${(1 - cardIn) * 34}px) scale(${0.97 + cardIn * 0.03})`,
          }}
        >
          <div
            style={{
              color: GOLD,
              fontSize: 24,
              fontWeight: 800,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              color: PAPER,
              fontFamily: "Georgia, Times New Roman, serif",
              fontSize: 78,
              lineHeight: 1.04,
              marginTop: 18,
            }}
          >
            {truncate(title, 72)}
          </div>
          <div
            style={{
              width: lineWidth,
              height: 5,
              backgroundColor: RED,
              marginTop: 28,
              marginBottom: 24,
            }}
          />
          <div
            style={{
              color: "rgba(241,234,217,0.88)",
              fontSize: 30,
              lineHeight: 1.35,
              fontWeight: 600,
              maxWidth: 760,
            }}
          >
            {truncate(subtitle, 120)}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 30,
              gap: 28,
            }}
          >
            <div
              style={{
                color: "rgba(241,234,217,0.62)",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {totalFacts} facts / documentary list format
            </div>
            <ProgressRail total={totalFacts} activeIndex={0} />
          </div>
        </div>
      </AbsoluteFill>
    </FadeWrap>
  );
};

const FactScene: React.FC<{
  fact: FactListItem;
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
  const label = cleanText(fact.label, fact.factType ? `${fact.factType} fact` : "surprising fact");
  const titleLines = splitLines(cleanText(fact.title, "Interesting classic car fact"), 28, 2);
  const bodyLines = splitLines(cleanText(fact.body, ""), 52, 5);
  const highlight = cleanText(fact.highlight, "");
  const number = String(fact.number || index + 1).padStart(2, "0");
  const titleSize = titleLines.length > 1 ? 50 : 58;

  return (
    <FadeWrap duration={duration}>
      <BaseBackground accent={index % 2 === 0 ? GOLD : GREEN} />
      <MediaLayer media={media} duration={duration} ghostNumber={number} />
      {audioUrl ? <Audio src={audioUrl} /> : null}
      <FactGraphicLayer fact={fact} duration={duration} />

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, rgba(241,234,217,${0.24 * glow}), ${RED})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: PAPER,
                fontFamily: "Georgia, Times New Roman, serif",
                fontSize: 40,
                fontWeight: 700,
                boxShadow: "0 12px 28px rgba(0,0,0,0.34)",
              }}
            >
              {number}
            </div>
            <div>
              <div
                style={{
                  color: GOLD,
                  fontSize: 20,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                {truncate(label, 24)}
              </div>
              <div
                style={{
                  color: "rgba(241,234,217,0.68)",
                  fontSize: 20,
                  fontWeight: 700,
                  marginTop: 6,
                }}
              >
                {number} / {String(total).padStart(2, "0")} / {cleanText(category, "Classic Cars")}
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
            gap: 48,
          }}
        >
          <div
            style={{
              width: 980,
              backgroundColor: "rgba(17,16,14,0.56)",
              border: `2px solid ${GOLD}`,
              borderRadius: 20,
              padding: "34px 38px 30px 38px",
              boxShadow: "0 24px 58px rgba(0,0,0,0.42)",
              transform: `translateY(${(1 - cardEnter) * 24}px) scale(${0.975 + cardEnter * 0.025})`,
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
                backgroundColor: RED,
                marginTop: 24,
                marginBottom: 24,
              }}
            />
            <div
              style={{
                color: "rgba(241,234,217,0.9)",
                fontSize: 28,
                lineHeight: 1.34,
                fontWeight: 600,
                maxWidth: 820,
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
                width: 360,
                backgroundColor: "rgba(17,16,14,0.44)",
                border: "1px solid rgba(241,234,217,0.2)",
                borderRadius: 18,
                padding: "22px 24px",
                boxShadow: "0 18px 48px rgba(0,0,0,0.28)",
                transform: `translateY(${(1 - cardEnter) * 18}px)`,
              }}
            >
              <div
                style={{
                  color: GOLD,
                  fontSize: 18,
                  fontWeight: 800,
                  textTransform: "uppercase",
                }}
              >
                Quick takeaway
              </div>
              <div
                style={{
                  color: PAPER,
                  fontSize: 26,
                  lineHeight: 1.25,
                  fontWeight: 700,
                  marginTop: 14,
                }}
              >
                {truncate(highlight, 100)}
              </div>
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </FadeWrap>
  );
};

const OutroScene: React.FC<{
  props: ClassicCarFactsProps;
  duration: number;
}> = ({ props, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioUrl = getAudioUrl(props.outro);
  const title = cleanText(props.outro?.title, "Which fact surprised you most?");
  const body = cleanText(
    props.outro?.body,
    "The best classic-car stories usually live in the details."
  );
  const scale = spring({
    frame,
    fps,
    config: { stiffness: 54, damping: 18 },
  });

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
            fontSize: 24,
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          Closing thought
        </div>
        <div
          style={{
            color: PAPER,
            fontFamily: "Georgia, Times New Roman, serif",
            fontSize: 74,
            lineHeight: 1.08,
            marginTop: 24,
            transform: `scale(${0.97 + scale * 0.03})`,
            maxWidth: 1180,
          }}
        >
          {truncate(title, 86)}
        </div>
        <div
          style={{
            width: 420,
            height: 5,
            backgroundColor: RED,
            marginTop: 30,
            marginBottom: 28,
          }}
        />
        <div
          style={{
            color: "rgba(241,234,217,0.84)",
            fontSize: 32,
            lineHeight: 1.36,
            maxWidth: 1020,
            fontWeight: 600,
          }}
        >
          {truncate(body, 180)}
        </div>
      </AbsoluteFill>
    </FadeWrap>
  );
};

export const ClassicCarFacts: React.FC<ClassicCarFactsProps> = (props) => {
  const { fps, durationInFrames } = useVideoConfig();
  const mergedProps: ClassicCarFactsProps = {
    ...classicCarFactsDefaultProps,
    ...props,
    intro: {
      ...classicCarFactsDefaultProps.intro,
      ...props.intro,
    },
    outro: {
      ...classicCarFactsDefaultProps.outro,
      ...props.outro,
    },
    facts: props.facts && props.facts.length > 0 ? props.facts : classicCarFactsDefaultProps.facts,
  };
  const timeline = buildFactTimeline(mergedProps, fps);
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
            return 0.1 * Math.min(fadeIn, fadeOut);
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
              <IntroScene
                props={mergedProps}
                duration={section.duration}
                totalFacts={timeline.facts.length}
              />
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
            <FactScene
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
