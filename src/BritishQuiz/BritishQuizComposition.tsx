import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { quizQuestions, QuizQuestion } from "./data";
import { QUESTION_FRAMES, QuizQuestionScene } from "./QuizQuestion";

const INTRO_FRAMES = 90;      // 3s intro
const TRANSITION_FRAMES = 30; // 1s black between questions

export interface BritishQuizProps {
  questions?: QuizQuestion[];
}

function getTotalFrames(questions: QuizQuestion[]) {
  return (
    INTRO_FRAMES +
    questions.length * QUESTION_FRAMES +
    (questions.length - 1) * TRANSITION_FRAMES
  );
}

export const QUIZ_TOTAL_FRAMES = getTotalFrames(quizQuestions);

// ─── Intro screen ─────────────────────────────────────────────────────────────
const QuizIntro: React.FC<{ count: number }> = ({ count }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, config: { stiffness: 80, damping: 14 } });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const sceneOpacity = interpolate(frame, [INTRO_FRAMES - 20, INTRO_FRAMES], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0a1a6e 0%, #1a237e 40%, #0d47a1 100%)",
        justifyContent: "center",
        alignItems: "center",
        opacity: sceneOpacity,
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -150, left: -150, width: 500, height: 500, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
      <div style={{ position: "absolute", bottom: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
      <div style={{ position: "absolute", top: "30%", right: 80, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />

      <div style={{ textAlign: "center", opacity: titleOpacity, transform: `scale(${titleScale})`, zIndex: 1 }}>
        <div style={{ fontSize: 30, letterSpacing: 10, color: "rgba(255,255,255,0.7)", fontFamily: "'Arial', sans-serif", fontWeight: 700, textTransform: "uppercase", marginBottom: 24 }}>
          🇬🇧 &nbsp; Welcome to the
        </div>
        <div style={{ fontSize: 120, fontWeight: 900, color: "#ffffff", fontFamily: "'Arial Black', 'Arial', sans-serif", lineHeight: 1, textShadow: "0 4px 40px rgba(0,0,0,0.4)" }}>
          BRITISH
        </div>
        <div style={{ fontSize: 120, fontWeight: 900, color: "#FDD835", fontFamily: "'Arial Black', 'Arial', sans-serif", lineHeight: 1, textShadow: "0 4px 40px rgba(0,0,0,0.4)" }}>
          OLDTIMER
        </div>
        <div style={{ fontSize: 120, fontWeight: 900, color: "#ffffff", fontFamily: "'Arial Black', 'Arial', sans-serif", lineHeight: 1, textShadow: "0 4px 40px rgba(0,0,0,0.4)" }}>
          QUIZ
        </div>
        <div style={{ marginTop: 48, opacity: subtitleOpacity, fontSize: 28, color: "rgba(255,255,255,0.65)", fontFamily: "'Arial', sans-serif", letterSpacing: 4, fontWeight: 600 }}>
          {count} QUESTIONS · CAN YOU IDENTIFY THEM ALL?
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────
export const BritishQuizComposition: React.FC<BritishQuizProps> = ({ questions }) => {
  const activeQuestions = (questions && questions.length > 0) ? questions : quizQuestions;

  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #0a1a6e 0%, #1a237e 40%, #0d47a1 100%)" }}>
      {/* Intro */}
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <QuizIntro count={activeQuestions.length} />
      </Sequence>

      {/* Questions */}
      {activeQuestions.map((question, index) => {
        const from = INTRO_FRAMES + index * (QUESTION_FRAMES + TRANSITION_FRAMES);

        return (
          <Sequence key={index} from={from} durationInFrames={QUESTION_FRAMES}>
            {/* Voiceover audio for this question */}
            {question.voiceoverUrl && (
              <Audio src={question.voiceoverUrl} />
            )}
            <QuizQuestionScene
              question={question}
              questionNumber={index + 1}
              totalQuestions={activeQuestions.length}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
