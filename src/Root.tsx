import React from "react";
import { Composition } from "remotion";
import { SocialClip } from "./templates/SocialClip";
import { ImageSlideshow } from "./templates/ImageSlideshow";
import { TextAnimation } from "./templates/TextAnimation";
import { BritishOldtimerQuiz, QUESTION_FRAMES } from "./templates/BritishOldtimerQuiz";

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
        calculateMetadata={({ props }) => {
          const questions = (props.questions as unknown[]) || [];
          const count = Math.max(1, questions.length);
          // 90 Intro + N×420 Fragen + (N-1)×30 Übergänge
          const total = 90 + count * QUESTION_FRAMES + (count - 1) * 30;
          return { durationInFrames: total };
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
