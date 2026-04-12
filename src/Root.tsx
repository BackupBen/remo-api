import "./index.css";
import { Composition, getStaticFiles } from "remotion";
import { AIVideo, aiVideoSchema } from "./components/AIVideo";
import { FPS, INTRO_DURATION } from "./lib/constants";
import { getTimelinePath, loadTimelineFromFile } from "./lib/utils";
import {
  BritishQuizComposition,
  BritishQuizProps,
  QUIZ_TOTAL_FRAMES,
} from "./BritishQuiz/BritishQuizComposition";
import { QUESTION_FRAMES } from "./BritishQuiz/QuizQuestion";

export const RemotionRoot: React.FC = () => {
  const staticFiles = getStaticFiles();
  const timelines = staticFiles
    .filter((file) => file.name.endsWith("timeline.json"))
    .map((file) => file.name.split("/")[1]);

  return (
    <>
      {/* ── British Oldtimer Quiz ────────────────────────────────────────── */}
      <Composition
        id="BritishOldtimerQuiz"
        component={BritishQuizComposition}
        fps={30}
        width={1920}
        height={1080}
        durationInFrames={QUIZ_TOTAL_FRAMES}
        defaultProps={{ questions: undefined }}
        calculateMetadata={({ props }: { props: BritishQuizProps }) => {
          const questions = props.questions;
          if (!questions || questions.length === 0) {
            return { durationInFrames: QUIZ_TOTAL_FRAMES };
          }
          const INTRO = 90;
          const TRANSITION = 30;
          const total = INTRO + questions.length * QUESTION_FRAMES + (questions.length - 1) * TRANSITION;
          return { durationInFrames: total };
        }}
      />

      {/* ── AI Video compositions (from existing template) ───────────────── */}
      {timelines.map((storyName) => (
        <Composition
          id={storyName}
          component={AIVideo}
          fps={FPS}
          width={1080}
          height={1920}
          schema={aiVideoSchema}
          defaultProps={{
            timeline: null,
          }}
          calculateMetadata={async ({ props }) => {
            const { lengthFrames, timeline } = await loadTimelineFromFile(
              getTimelinePath(storyName),
            );

            return {
              durationInFrames: lengthFrames + INTRO_DURATION,
              props: {
                ...props,
                timeline,
              },
            };
          }}
        />
      ))}
    </>
  );
};
