import React from "react";
import { Composition } from "remotion";
import { getAudioData } from "@remotion/media-utils";
import { SocialClip } from "./templates/SocialClip";
import { ImageSlideshow } from "./templates/ImageSlideshow";
import { TextAnimation } from "./templates/TextAnimation";
import { getAudioDurationInSeconds } from "remotion";
import {
  BritishOldtimerQuiz,
  QUESTION_FRAMES,
  INTRO_FRAMES,
  TRANSITION_FRAMES,
  REVEAL_START,
} from "./templates/BritishOldtimerQuiz";
import type { QuizQuestion } from "./templates/BritishOldtimerQuiz";
import {
  OldtimerShowcase,
  getOldtimerShowcaseDurationInFrames,
  oldtimerShowcaseDefaultProps,
} from "./templates/OldtimerShowcase";
import type { OldtimerShowcaseProps } from "./templates/OldtimerShowcase";
import {
  ClassicCarFacts,
  classicCarFactsDefaultProps,
  getClassicCarFactsDurationInFrames,
} from "./templates/ClassicCarFacts";
import type {
  ClassicCarFactsProps,
  FactListItem,
} from "./templates/ClassicCarFacts";
import {
  WatchPsychology,
  getWatchPsychologyDurationInFrames,
  watchPsychologyDefaultProps,
} from "./templates/WatchPsychology";
import type {
  WatchPsychologyInsight,
  WatchPsychologyProps,
} from "./templates/WatchPsychology";

const getSectionAudioUrl = (section?: {
  voiceoverUrl?: string;
  audioUrl?: string;
}) => section?.voiceoverUrl || section?.audioUrl || "";

const measureAudioSeconds = async (
  url: string,
  fallback?: number
): Promise<number | undefined> => {
  if (!url) {
    return fallback;
  }

  try {
    return await getAudioDurationInSeconds(url);
  } catch (error) {
    console.error("[OldtimerShowcase] getAudioDurationInSeconds failed for", url, error);
    return fallback;
  }
};

const watchSpeechDurationCache = new Map<string, number | undefined>();

const measureWatchSpeechSeconds = async (
  url: string,
  fallback?: number
): Promise<number | undefined> => {
  if (!url) {
    return fallback;
  }

  if (watchSpeechDurationCache.has(url)) {
    return watchSpeechDurationCache.get(url);
  }

  try {
    const audioData = await getAudioData(url, { sampleRate: 16000 });
    const channels = audioData.channelWaveforms || [];
    const sampleRate = audioData.sampleRate || 16000;
    const totalDuration = Number(audioData.durationInSeconds || 0);

    if (channels.length === 0 || sampleRate <= 0 || totalDuration <= 0) {
      const measured = await measureAudioSeconds(url, fallback);
      watchSpeechDurationCache.set(url, measured);
      return measured;
    }

    let peak = 0;
    for (const channel of channels) {
      for (let i = 0; i < channel.length; i++) {
        const amplitude = Math.abs(channel[i]);
        if (amplitude > peak) {
          peak = amplitude;
        }
      }
    }

    const totalSamples = channels[0]?.length || 0;
    const windowSize = Math.max(512, Math.round(sampleRate * 0.08));
    const peakThreshold = Math.max(0.0045, peak * 0.045);
    const rmsThreshold = Math.max(0.0018, peakThreshold * 0.38);
    let lastActiveSample = totalSamples - 1;
    let foundActiveWindow = false;

    for (let end = totalSamples; end > 0; end -= windowSize) {
      const start = Math.max(0, end - windowSize);
      let windowPeak = 0;
      let windowEnergy = 0;
      let sampleCount = 0;

      for (const channel of channels) {
        for (let i = start; i < end; i++) {
          const amplitude = Math.abs(channel[i] || 0);
          if (amplitude > windowPeak) {
            windowPeak = amplitude;
          }
          windowEnergy += amplitude * amplitude;
          sampleCount += 1;
        }
      }

      const rms = sampleCount > 0 ? Math.sqrt(windowEnergy / sampleCount) : 0;
      const isActive = windowPeak >= peakThreshold || rms >= rmsThreshold;

      if (isActive) {
        lastActiveSample = end;
        foundActiveWindow = true;
        break;
      }
    }

    if (!foundActiveWindow) {
      const measured = await measureAudioSeconds(url, fallback);
      watchSpeechDurationCache.set(url, measured);
      return measured;
    }

    const speechEndSeconds = Math.min(
      totalDuration,
      Math.max(0.8, lastActiveSample / sampleRate + 0.18)
    );
    const trailingSilence = totalDuration - speechEndSeconds;
    const resolved =
      trailingSilence >= 0.35 ? speechEndSeconds : totalDuration;

    watchSpeechDurationCache.set(url, resolved);
    return resolved;
  } catch (error) {
    console.error("[WatchPsychology] speech measurement failed for", url, error);
    const measured = await measureAudioSeconds(url, fallback);
    watchSpeechDurationCache.set(url, measured);
    return measured;
  }
};

const withMeasuredOldtimerAudio = async (
  props: OldtimerShowcaseProps
): Promise<OldtimerShowcaseProps> => {
  const introUrl = getSectionAudioUrl(props.intro);
  const outroUrl = getSectionAudioUrl(props.outro);
  const cars = props.cars || [];

  const [introSeconds, outroSeconds, carSeconds] = await Promise.all([
    measureAudioSeconds(
      introUrl,
      props.intro?.audioDurationSeconds ||
        props.intro?.voiceoverDurationSeconds ||
        props.intro?.durationSeconds
    ),
    measureAudioSeconds(
      outroUrl,
      props.outro?.audioDurationSeconds ||
        props.outro?.voiceoverDurationSeconds ||
        props.outro?.durationSeconds
    ),
    Promise.all(
      cars.map((car) =>
        measureAudioSeconds(
          getSectionAudioUrl(car),
          car.audioDurationSeconds ||
            car.voiceoverDurationSeconds ||
            car.durationSeconds ||
            car.estimatedDurationSeconds
        )
      )
    ),
  ]);

  return {
    ...props,
    intro: {
      ...props.intro,
      durationSeconds: introSeconds || props.intro?.durationSeconds,
      audioDurationSeconds: introSeconds || props.intro?.audioDurationSeconds,
      voiceoverDurationSeconds:
        introSeconds || props.intro?.voiceoverDurationSeconds,
    },
    cars: cars.map((car, index) => {
      const seconds = carSeconds[index];

      return {
        ...car,
        durationSeconds: seconds || car.durationSeconds,
        audioDurationSeconds: seconds || car.audioDurationSeconds,
        voiceoverDurationSeconds: seconds || car.voiceoverDurationSeconds,
      };
    }),
    outro: {
      ...props.outro,
      durationSeconds: outroSeconds || props.outro?.durationSeconds,
      audioDurationSeconds: outroSeconds || props.outro?.audioDurationSeconds,
      voiceoverDurationSeconds:
        outroSeconds || props.outro?.voiceoverDurationSeconds,
    },
  };
};

const withMeasuredFactListAudio = async (
  props: ClassicCarFactsProps
): Promise<ClassicCarFactsProps> => {
  const introUrl = getSectionAudioUrl(props.intro);
  const outroUrl = getSectionAudioUrl(props.outro);
  const facts = (props.facts || []) as FactListItem[];

  const [introSeconds, outroSeconds, factSeconds] = await Promise.all([
    measureAudioSeconds(
      introUrl,
      props.intro?.audioDurationSeconds ||
        props.intro?.voiceoverDurationSeconds ||
        props.intro?.durationSeconds
    ),
    measureAudioSeconds(
      outroUrl,
      props.outro?.audioDurationSeconds ||
        props.outro?.voiceoverDurationSeconds ||
        props.outro?.durationSeconds
    ),
    Promise.all(
      facts.map((fact) =>
        measureAudioSeconds(
          getSectionAudioUrl(fact),
          fact.audioDurationSeconds ||
            fact.voiceoverDurationSeconds ||
            fact.durationSeconds
        )
      )
    ),
  ]);

  return {
    ...props,
    intro: {
      ...props.intro,
      durationSeconds: introSeconds || props.intro?.durationSeconds,
      audioDurationSeconds: introSeconds || props.intro?.audioDurationSeconds,
      voiceoverDurationSeconds:
        introSeconds || props.intro?.voiceoverDurationSeconds,
    },
    facts: facts.map((fact, index) => {
      const seconds = factSeconds[index];

      return {
        ...fact,
        durationSeconds: seconds || fact.durationSeconds,
        audioDurationSeconds: seconds || fact.audioDurationSeconds,
        voiceoverDurationSeconds:
          seconds || fact.voiceoverDurationSeconds,
      };
    }),
    outro: {
      ...props.outro,
      durationSeconds: outroSeconds || props.outro?.durationSeconds,
      audioDurationSeconds: outroSeconds || props.outro?.audioDurationSeconds,
      voiceoverDurationSeconds:
        outroSeconds || props.outro?.voiceoverDurationSeconds,
    },
  };
};

const withMeasuredWatchPsychologyAudio = async (
  props: WatchPsychologyProps
): Promise<WatchPsychologyProps> => {
  const introUrl = getSectionAudioUrl(props.intro);
  const outroUrl = getSectionAudioUrl(props.outro);
  const facts = (props.facts || []) as WatchPsychologyInsight[];

  const resolveWatchSectionSeconds = async (
    url: string,
    fallback?: number
  ) => {
    if (!url) {
      return fallback;
    }

    return measureWatchSpeechSeconds(url, fallback);
  };

  const [introSeconds, outroSeconds, factSeconds] = await Promise.all([
    resolveWatchSectionSeconds(
      introUrl,
      props.intro?.audioDurationSeconds ||
        props.intro?.voiceoverDurationSeconds ||
        props.intro?.durationSeconds
    ),
    resolveWatchSectionSeconds(
      outroUrl,
      props.outro?.audioDurationSeconds ||
        props.outro?.voiceoverDurationSeconds ||
        props.outro?.durationSeconds
    ),
    Promise.all(
      facts.map((fact) =>
        resolveWatchSectionSeconds(
          getSectionAudioUrl(fact),
          fact.audioDurationSeconds ||
            fact.voiceoverDurationSeconds ||
            fact.durationSeconds
        )
      )
    ),
  ]);

  return {
    ...props,
    intro: {
      ...props.intro,
      durationSeconds: introSeconds || props.intro?.durationSeconds,
      audioDurationSeconds: introSeconds || props.intro?.audioDurationSeconds,
      voiceoverDurationSeconds:
        introSeconds || props.intro?.voiceoverDurationSeconds,
    },
    facts: facts.map((fact, index) => {
      const seconds = factSeconds[index];

      return {
        ...fact,
        durationSeconds: seconds || fact.durationSeconds,
        audioDurationSeconds: seconds || fact.audioDurationSeconds,
        voiceoverDurationSeconds:
          seconds || fact.voiceoverDurationSeconds,
      };
    }),
    outro: {
      ...props.outro,
      durationSeconds: outroSeconds || props.outro?.durationSeconds,
      audioDurationSeconds: outroSeconds || props.outro?.audioDurationSeconds,
      voiceoverDurationSeconds:
        outroSeconds || props.outro?.voiceoverDurationSeconds,
    },
  };
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="SocialClip"
        component={SocialClip}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={150}
        defaultProps={{
          title: "Titel hier",
          subtitle: "Untertitel",
          backgroundImage: "",
          accentColor: "#FF6B6B",
        }}
      />
      <Composition
        id="ImageSlideshow"
        component={ImageSlideshow}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={90}
        calculateMetadata={({ props }) => {
          const images = props.images || [];
          const secondsPerImage = props.secondsPerImage || 3;
          return {
            durationInFrames: Math.max(
              30,
              images.length * secondsPerImage * 30
            ),
          };
        }}
        defaultProps={{
          images: [] as string[],
          transitionType: "fade" as "fade" | "slide" | "zoom",
          secondsPerImage: 3,
          title: "",
          musicUrl: "",
        }}
      />
      <Composition
        id="BritishOldtimerQuiz"
        component={BritishOldtimerQuiz}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={90}
        calculateMetadata={async ({ props }) => {
          const questions = (props.questions as QuizQuestion[]) || [];
          const fps = 30; // muss hardcoded sein — calculateMetadata erhält keinen fps-Parameter
          const PADDING = 90; // 3s Puffer nach dem letzten Wort

          // Pro Frage: Voiceover-Länge messen und Frames berechnen
          const questionDurations = await Promise.all(
            questions.map(async (q) => {
              // 1. Prefer pre-calculated duration from n8n (no fetch needed)
              if (q.voiceoverDurationSeconds) {
                return Math.ceil(REVEAL_START + q.voiceoverDurationSeconds * fps + PADDING);
              }
              // 2. Fallback: try fetching audio duration at render time
              if (q.voiceoverUrl) {
                try {
                  const secs = await getAudioDurationInSeconds(q.voiceoverUrl);
                  return Math.ceil(REVEAL_START + secs * fps + PADDING);
                } catch (e) {
                  console.error('[BritishQuiz] getAudioDurationInSeconds failed for', q.voiceoverUrl, e);
                  return 1800; // 60s fallback — safe for any voiceover length
                }
              }
              return QUESTION_FRAMES;
            })
          );

          const total =
            INTRO_FRAMES +
            questionDurations.reduce((s, d) => s + d, 0) +
            Math.max(0, questions.length - 1) * TRANSITION_FRAMES;

          return {
            durationInFrames: Math.max(total, 90),
            props: { ...props, questionDurations },
          };
        }}
        defaultProps={{
          questions: [
            {
              correctAnswer: "Jaguar E-Type",
              year: 1961,
              image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Jaguar_E-Type_Series_I_3.8_Roadster.jpg/1280px-Jaguar_E-Type_Series_I_3.8_Roadster.jpg",
              options: ["Triumph TR4", "Jaguar E-Type", "MGB Roadster", "Sunbeam Alpine"] as [string, string, string, string],
              correctIndex: 1,
              funFact: "Enzo Ferrari nannte ihn das schönste Auto der Welt.",
            },
          ],
          questionDurations: undefined,
          difficulty: "easy" as "easy" | "medium" | "hard",
        }}
      />

      <Composition
        id="OldtimerShowcase"
        component={OldtimerShowcase}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={getOldtimerShowcaseDurationInFrames(oldtimerShowcaseDefaultProps)}
        calculateMetadata={async ({ props }) => {
          const measuredProps = await withMeasuredOldtimerAudio(props);

          return {
            durationInFrames: getOldtimerShowcaseDurationInFrames(measuredProps),
            props: measuredProps,
          };
        }}
        defaultProps={oldtimerShowcaseDefaultProps}
      />

      <Composition
        id="ClassicCarFacts"
        component={ClassicCarFacts}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={getClassicCarFactsDurationInFrames(
          classicCarFactsDefaultProps
        )}
        calculateMetadata={async ({ props }) => {
          const measuredProps = await withMeasuredFactListAudio(props);

          return {
            durationInFrames: getClassicCarFactsDurationInFrames(
              measuredProps
            ),
            props: measuredProps,
          };
        }}
        defaultProps={classicCarFactsDefaultProps}
      />

      <Composition
        id="WatchPsychology"
        component={WatchPsychology}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={getWatchPsychologyDurationInFrames(
          watchPsychologyDefaultProps
        )}
        calculateMetadata={async ({ props }) => {
          const measuredProps = await withMeasuredWatchPsychologyAudio(props);

          return {
            durationInFrames: getWatchPsychologyDurationInFrames(
              measuredProps
            ),
            props: measuredProps,
          };
        }}
        defaultProps={watchPsychologyDefaultProps}
      />

      <Composition
        id="TextAnimation"
        component={TextAnimation}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={150}
        calculateMetadata={({ props }) => {
          const text = props.text || "";
          const style = props.style || "typewriter";
          const words = text.split(/\s+/).filter(Boolean);
          let frames = 150;
          if (style === "typewriter") {
            frames = Math.max(60, text.length * 3 + 60);
          } else if (style === "fade-words") {
            frames = Math.max(60, words.length * 10 + 60);
          } else if (style === "bounce-in") {
            frames = Math.max(60, words.length * 12 + 60);
          }
          return { durationInFrames: frames };
        }}
        defaultProps={{
          text: "Dein Text hier",
          style: "typewriter" as "typewriter" | "fade-words" | "bounce-in",
          fontSize: 72,
          fontColor: "#FFFFFF",
          backgroundColor: "#1a1a2e",
          textAlign: "center" as "left" | "center" | "right",
        }}
      />
    </>
  );
};
