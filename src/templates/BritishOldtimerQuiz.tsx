import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuizQuestion {
  correctAnswer: string;
  year: number;
  /** Vollständige URL (MinIO, HTTP, etc.) — kein staticFile() */
  image: string;
  options: [string, string, string, string];
  correctIndex: number;
  funFact: string;
  /** Optional: URL zur Voiceover-MP3 (wird in der Reveal-Phase abgespielt) */
  voiceoverUrl?: string;
}

export interface BritishQuizProps {
  questions: QuizQuestion[];
}

// ─── Konstanten ───────────────────────────────────────────────────────────────

const OPTION_COLORS = ["#e63946", "#457b9d", "#f4a261", "#2a9d8f"] as const;
const OPTION_LABELS = ["A", "B", "C", "D"] as const;

export const QUESTION_FRAMES = 420; // 14s pro Frage
const INTRO_FRAMES = 90;            // 3s Intro
const TRANSITION_FRAMES = 30;       // 1s Übergang zwischen Fragen

// Timing innerhalb einer Frage (Frames)
const CAR_FADE_IN_END = 20;
const ANSWERS_START = 90;
const ANSWER_STAGGER = 18;
const THINK_START = ANSWERS_START + 4 * ANSWER_STAGGER + 20; // ~163
const REVEAL_START = 310;
const FACT_START = 350;

// ─── Quiz-Frage ───────────────────────────────────────────────────────────────

const QuizQuestionScene: React.FC<{
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
}> = ({ question, questionNumber, totalQuestions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Bild
  const carOpacity = interpolate(frame, [0, CAR_FADE_IN_END], [0, 1], { extrapolateRight: "clamp" });
  const carScale   = interpolate(frame, [0, CAR_FADE_IN_END], [1.04, 1], { extrapolateRight: "clamp" });
  const kenBurns   = interpolate(frame, [0, REVEAL_START], [1, 1.05], { extrapolateRight: "clamp" });

  // Fragezeichen
  const qmarkOpacity = interpolate(frame, [ANSWERS_START - 20, ANSWERS_START], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Timer-Balken
  const timerProgress = interpolate(frame, [THINK_START, REVEAL_START], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const timerColor =
    timerProgress > 0.5 ? "#00c853" : timerProgress > 0.25 ? "#ffd600" : "#ff1744";

  const isRevealed = frame >= REVEAL_START;

  // Antwort-Styles
  const getOptionStyle = (index: number): React.CSSProperties => {
    const start   = ANSWERS_START + index * ANSWER_STAGGER;
    const opacity = interpolate(frame, [start, start + 18], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    const translateY = interpolate(frame, [start, start + 18], [24, 0], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    const isCorrect = index === question.correctIndex;
    const revealScale =
      isRevealed && isCorrect
        ? spring({ frame: frame - REVEAL_START, fps, config: { stiffness: 200, damping: 15 } }) * 0.04 + 1
        : 1;

    return {
      opacity,
      transform: `translateY(${translateY}px) scale(${revealScale})`,
      backgroundColor: isRevealed
        ? isCorrect ? "rgba(0,200,83,0.3)" : "rgba(0,0,0,0.4)"
        : "rgba(255,255,255,0.08)",
      border: `2px solid ${isRevealed ? (isCorrect ? "#00c853" : "rgba(255,255,255,0.06)") : "rgba(255,255,255,0.15)"}`,
      borderRadius: 14,
      padding: "18px 24px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      color: `rgba(255,255,255,${isRevealed && !isCorrect ? 0.35 : 1})`,
    };
  };

  // Szene ausblenden
  const sceneOpacity = interpolate(frame, [QUESTION_FRAMES - 20, QUESTION_FRAMES], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1b2a", opacity: sceneOpacity, fontFamily: "'Georgia', serif" }}>

      {/* Voiceover (spielt ab Reveal-Phase) */}
      {question.voiceoverUrl && isRevealed && (
        <Sequence from={REVEAL_START} durationInFrames={QUESTION_FRAMES - REVEAL_START}>
          <Audio src={question.voiceoverUrl} />
        </Sequence>
      )}

      {/* Auto-Bild (oben 62%) */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "62%",
        overflow: "hidden", opacity: carOpacity,
        transform: `scale(${carScale * kenBurns})`, transformOrigin: "center center",
      }}>
        <Img
          src={question.image}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Verlaufs-Übergang unten */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "55%",
          background: "linear-gradient(to bottom, transparent, #0d1b2a)",
        }} />
        {/* Vignette */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }} />
      </div>

      {/* Fragezeichen-Overlay */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translateX(-50%) translateY(-50%)",
        opacity: qmarkOpacity, fontSize: 120, fontWeight: "bold",
        color: "rgba(255,255,255,0.18)", letterSpacing: -4,
        textShadow: "0 4px 40px rgba(0,0,0,0.6)", userSelect: "none",
      }}>?</div>

      {/* Fragen-Chip (oben links) */}
      <div style={{
        position: "absolute", top: 28, left: 36,
        backgroundColor: "#004225", color: "#fff",
        fontSize: 22, fontFamily: "'Arial', sans-serif", fontWeight: 700,
        padding: "8px 20px", borderRadius: 999, letterSpacing: 1,
        border: "1.5px solid rgba(255,255,255,0.2)",
      }}>
        QUESTION {questionNumber} / {totalQuestions}
      </div>

      {/* Flagge (oben rechts) */}
      <div style={{ position: "absolute", top: 24, right: 36, fontSize: 40, opacity: 0.85 }}>
        🇬🇧
      </div>

      {/* Frage-Label */}
      <div style={{
        position: "absolute", top: "59%", left: 0, right: 0,
        textAlign: "center", color: "rgba(255,255,255,0.55)",
        fontSize: 22, fontFamily: "'Arial', sans-serif",
        fontWeight: 600, letterSpacing: 5, textTransform: "uppercase",
      }}>
        Which car is this?
      </div>

      {/* Timer-Balken */}
      <div style={{
        position: "absolute", top: "63.5%", left: 60, right: 60,
        height: 5, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${timerProgress * 100}%`,
          backgroundColor: timerColor, borderRadius: 999,
        }} />
      </div>

      {/* Antworten 2×2 */}
      <div style={{
        position: "absolute", top: "66%", left: 60, right: 60, bottom: 40,
        display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 18,
      }}>
        {question.options.map((option, index) => {
          const isCorrect = index === question.correctIndex;
          return (
            <div key={index} style={getOptionStyle(index)}>
              {/* Buchstaben-Badge */}
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                backgroundColor: isRevealed && !isCorrect ? "rgba(255,255,255,0.08)" : OPTION_COLORS[index],
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 800, color: "#fff",
                fontFamily: "'Arial', sans-serif",
                opacity: isRevealed && !isCorrect ? 0.3 : 1,
              }}>
                {isRevealed && isCorrect ? "✓" : OPTION_LABELS[index]}
              </div>
              {/* Antworttext */}
              <span style={{ fontSize: 28, fontWeight: 600, fontFamily: "'Arial', sans-serif", lineHeight: 1.2 }}>
                {option}
                {isRevealed && isCorrect && (
                  <span style={{ display: "block", fontSize: 16, fontWeight: 400, color: "#a8e6b8", marginTop: 3 }}>
                    {question.year}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fun Fact (nach Reveal) */}
      {isRevealed && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          opacity: interpolate(frame, [FACT_START, FACT_START + 20], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          }),
          backgroundColor: "rgba(0,66,37,0.85)",
          borderTop: "1px solid rgba(255,255,255,0.15)",
          padding: "12px 60px",
        }}>
          <span style={{ fontSize: 19, color: "rgba(255,255,255,0.88)", fontFamily: "'Arial', sans-serif", fontStyle: "italic" }}>
            💡 {question.funFact}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ─── Intro-Screen ─────────────────────────────────────────────────────────────

const QuizIntro: React.FC<{ totalQuestions: number }> = ({ totalQuestions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale    = spring({ frame, fps, config: { stiffness: 80, damping: 14 } });
  const titleOpacity  = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const subOpacity    = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const sceneOpacity  = interpolate(frame, [INTRO_FRAMES - 20, INTRO_FRAMES], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1b2a", justifyContent: "center", alignItems: "center", opacity: sceneOpacity }}>
      {/* Hintergrund-Glow */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage:
          "radial-gradient(circle at 20% 50%, rgba(0,66,37,0.35) 0%, transparent 50%), " +
          "radial-gradient(circle at 80% 50%, rgba(0,40,100,0.35) 0%, transparent 50%)",
      }} />
      {/* Union Jack Streifen oben */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 8,
        background: "linear-gradient(to right, #C8102E 33%, #FFFFFF 33%, #FFFFFF 66%, #012169 66%)",
      }} />
      {/* Union Jack Streifen unten */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 8,
        background: "linear-gradient(to right, #012169 33%, #FFFFFF 33%, #FFFFFF 66%, #C8102E 66%)",
      }} />
      {/* Titel */}
      <div style={{ textAlign: "center", opacity: titleOpacity, transform: `scale(${titleScale})` }}>
        <div style={{ fontSize: 28, letterSpacing: 12, color: "#d4af37", fontFamily: "'Arial', sans-serif", fontWeight: 700, textTransform: "uppercase", marginBottom: 20 }}>
          🇬🇧 &nbsp; Welcome to the
        </div>
        {["British", "Oldtimer", "Quiz"].map((word, i) => (
          <div key={word} style={{
            fontSize: 110, fontWeight: 800, lineHeight: 1,
            fontFamily: "'Georgia', serif",
            color: i === 1 ? "#d4af37" : "#ffffff",
            textShadow: `0 6px 60px rgba(212,175,55,${i === 1 ? 0.6 : 0.4})`,
          }}>{word}</div>
        ))}
        <div style={{ marginTop: 40, opacity: subOpacity, fontSize: 26, color: "rgba(255,255,255,0.55)", fontFamily: "'Arial', sans-serif", letterSpacing: 3 }}>
          {totalQuestions} Questions · Can you identify them all?
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Hauptkomposition ─────────────────────────────────────────────────────────

export const BritishOldtimerQuiz: React.FC<BritishQuizProps> = ({ questions }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0d1b2a" }}>
      {/* Intro */}
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <QuizIntro totalQuestions={questions.length} />
      </Sequence>

      {/* Fragen */}
      {questions.map((question, index) => {
        const from = INTRO_FRAMES + index * (QUESTION_FRAMES + TRANSITION_FRAMES);
        return (
          <Sequence key={index} from={from} durationInFrames={QUESTION_FRAMES}>
            <QuizQuestionScene
              question={question}
              questionNumber={index + 1}
              totalQuestions={questions.length}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
