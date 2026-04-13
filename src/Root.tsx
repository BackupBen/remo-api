import React from "react";
import { Composition } from "remotion";
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
        }}
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
