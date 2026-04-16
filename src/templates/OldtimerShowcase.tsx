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

export interface ShowcaseIntro {
  hook?: string;
  voiceover?: string;
  durationSeconds?: number;
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
  media?: ShowcaseMedia[];
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

export const buildOldtimerShowcaseTimeline = (
  props: OldtimerShowcaseProps,
  fps = OLDTIMER_SHOWCASE_FPS
) => {
  const cars = (props.cars && props.cars.length > 0
    ? props.cars
    : oldtimerShowcaseDefaultProps.cars || []) as ShowcaseCar[];
  const targetSeconds = props.targetDurationSeconds || 0;
  const introSeconds =
    props.intro?.durationSeconds ||
    (targetSeconds ? clamp(Math.round(targetSeconds * 0.1), 45, 90) : 72);
  const baseOutroSeconds = props.outro?.durationSeconds || DEFAULT_OUTRO_SECONDS;
  const reservedSeconds = introSeconds + baseOutroSeconds;
  const sharedChapterSeconds =
    cars.length > 0 && targetSeconds > reservedSeconds
      ? Math.max(
          45,
          Math.floor((targetSeconds - reservedSeconds) / cars.length)
        )
      : DEFAULT_CHAPTER_SECONDS;

  const sections: SectionTiming[] = [];
  let cursor = 0;
  const introDuration = secondsToFrames(introSeconds, fps);
  sections.push({ type: "intro", from: cursor, duration: introDuration });
  cursor += introDuration;

  cars.forEach((car, index) => {
    const seconds =
      car.durationSeconds ||
      car.estimatedDurationSeconds ||
      car.audioDurationSeconds ||
      car.voiceoverDurationSeconds ||
      sharedChapterSeconds;
    const duration = secondsToFrames(seconds, fps);
    sections.push({ type: "car", from: cursor, duration, car, index });
    cursor += duration;
  });

  const targetFrames = targetSeconds ? secondsToFrames(targetSeconds, fps) : 0;
  const remainingOutroFrames = Math.max(
    secondsToFrames(baseOutroSeconds, fps),
    targetFrames - cursor
  );
  sections.push({ type: "outro", from: cursor, duration: remainingOutroFrames });
  cursor += remainingOutroFrames;

  return {
    cars,
    sections,
    totalFrames: Math.max(cursor, targetFrames, MIN_SECTION_FRAMES),
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
  const { fps } = useVideoConfig();
  const validVideos = videos.filter((video) => getMediaUrl(video));

  if (validVideos.length === 0) {
    return null;
  }

  return (
    <AbsoluteFill>
      {validVideos.map((video, index) => {
        const segmentStart =
          typeof video.start === "number"
            ? Math.max(0, Math.round(video.start * fps))
            : Math.floor((duration / validVideos.length) * index);
        const segmentEnd =
          typeof video.end === "number"
            ? Math.round(video.end * fps)
            : Math.floor((duration / validVideos.length) * (index + 1));
        const from = clamp(segmentStart, 0, Math.max(0, duration - 1));
        const segmentDuration = Math.max(30, Math.min(duration - from, segmentEnd - from));

        return (
          <Sequence key={`${getMediaUrl(video)}-${index}`} from={from} durationInFrames={segmentDuration}>
            <AbsoluteFill>
              <OffthreadVideo
                src={getMediaUrl(video)}
                volume={0}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.05) saturate(0.88)",
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
  const subtitle = cleanText(props.subtitle, props.category || "");
  const hook = cleanText(props.intro?.hook, props.category || "");
  const introAudio = getAudioUrl(props.intro);
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
            marginBottom: 28,
            letterSpacing: 0,
          }}
        >
          Classic Car Showcase
        </div>
        <div
          style={{
            color: PAPER,
            fontFamily: "Georgia, Times New Roman, serif",
            fontSize: 92,
            lineHeight: 1.02,
            maxWidth: 1260,
            transform: `scale(${0.96 + scale * 0.04})`,
            transformOrigin: "left center",
            textShadow: "0 6px 34px rgba(0,0,0,0.45)",
          }}
        >
          {truncate(title || "", 86)}
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
          {truncate(subtitle || hook, 150)}
        </div>
        <div
          style={{
            color: "rgba(242,234,216,0.68)",
            fontSize: 23,
            lineHeight: 1.45,
            marginTop: 26,
            maxWidth: 980,
          }}
        >
          {truncate(hook, 170)}
        </div>
      </AbsoluteFill>
    </FadeWrap>
  );
};

const pickCarMedia = (car: ShowcaseCar) => {
  const media = (car.media || []).find((item) => getMediaUrl(item));
  if (media) {
    return media;
  }
  if (car.image || car.imageUrl) {
    return { mediaType: "image", mediaUrl: car.image || car.imageUrl } satisfies ShowcaseMedia;
  }
  return null;
};

const CarMediaLayer: React.FC<{
  car: ShowcaseCar;
  duration: number;
}> = ({ car, duration }) => {
  const frame = useCurrentFrame();
  const media = pickCarMedia(car);
  const mediaUrl = getMediaUrl(media);
  const zoom = interpolate(frame, [0, duration], [1, 1.08], {
    extrapolateRight: "clamp",
  });

  if (!mediaUrl) {
    return (
      <AbsoluteFill
        style={{
          alignItems: "flex-end",
          justifyContent: "center",
          paddingRight: 120,
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

  return (
    <AbsoluteFill>
      {media?.mediaType === "video" ? (
        <OffthreadVideo
          src={mediaUrl}
          volume={0}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.05) saturate(0.9)",
          }}
        />
      ) : (
        <Img
          src={mediaUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom})`,
            filter: "contrast(1.04) saturate(0.9)",
          }}
        />
      )}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(90deg, rgba(17,16,14,0.9) 0%, rgba(17,16,14,0.7) 42%, rgba(17,16,14,0.28) 75%, rgba(17,16,14,0.5) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const FactList: React.FC<{ facts: string[] }> = ({ facts }) => {
  const frame = useCurrentFrame();
  const safeFacts = facts.slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {safeFacts.map((fact, index) => {
        const opacity = interpolate(frame, [70 + index * 14, 95 + index * 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const x = interpolate(frame, [70 + index * 14, 95 + index * 14], [-22, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={`${fact}-${index}`}
            style={{
              opacity,
              transform: `translateX(${x}px)`,
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              color: "rgba(242,234,216,0.9)",
              fontSize: 27,
              lineHeight: 1.28,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                backgroundColor: GOLD,
                marginTop: 12,
                flexShrink: 0,
              }}
            />
            <span>{truncate(fact, 128)}</span>
          </div>
        );
      })}
    </div>
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
  const titleIn = spring({
    frame,
    fps,
    config: { stiffness: 75, damping: 18 },
  });
  const name = cleanText(car.name, "Unknown classic car");
  const hook = cleanText(car.hook, cleanText(car.voiceover || car.chapterVoiceover, ""));
  const facts = Array.isArray(car.facts) && car.facts.length > 0
    ? car.facts
    : [cleanText(car.voiceover || car.chapterVoiceover, "A characterful classic with a story worth telling.")];

  return (
    <FadeWrap duration={duration}>
      <BaseBackground accent={index % 2 === 0 ? GOLD : GREEN} />
      <CarMediaLayer car={car} duration={duration} />
      {audioUrl ? <Audio src={audioUrl} /> : null}
      <AbsoluteFill
        style={{
          padding: "86px 110px 76px 110px",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            color: GOLD,
            fontSize: 24,
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
            fontSize: 84,
            lineHeight: 1.02,
            marginTop: 34,
            maxWidth: 1100,
            transform: `translateY(${(1 - titleIn) * 30}px)`,
            textShadow: "0 6px 32px rgba(0,0,0,0.45)",
          }}
        >
          {truncate(name, 64)}
        </div>
        <div
          style={{
            color: "rgba(242,234,216,0.76)",
            fontSize: 31,
            lineHeight: 1.3,
            marginTop: 16,
            fontWeight: 700,
          }}
        >
          {[car.years, car.country].filter(Boolean).join(" | ")}
        </div>
        <div
          style={{
            width: 500,
            height: 5,
            backgroundColor: GOLD,
            marginTop: 34,
            marginBottom: 34,
          }}
        />
        <div
          style={{
            color: "rgba(242,234,216,0.92)",
            fontSize: 33,
            lineHeight: 1.32,
            maxWidth: 1020,
            fontWeight: 700,
            marginBottom: 34,
          }}
        >
          {truncate(hook, 160)}
        </div>
        <div style={{ maxWidth: 1030 }}>
          <FactList facts={facts} />
        </div>
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
