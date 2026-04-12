import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { OPTION_LABELS, QuizQuestion as QuizQuestionType } from "./data";

export const QUESTION_FRAMES = 480; // 16s per question (incl. 2s buffer after voiceover)

// Timing
const IMG_FULLSCREEN_END = 75;  // car stays fullscreen until frame 75 (2.5s)
const SHRINK_END = 105;          // shrink animation done by frame 105
const ANSWERS_START = 110;
const ANSWER_STAGGER = 18;
const THINK_START = ANSWERS_START + 4 * ANSWER_STAGGER + 20;
const REVEAL_START = 310;
const FACT_START = 350;

function resolveImage(image: string): string {
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return staticFile(`cars/${image}`);
}

const BADGE_COLORS = ["#1565C0", "#1565C0", "#1565C0", "#1565C0"];

interface Props {
  question: QuizQuestionType;
  questionNumber: number;
  totalQuestions: number;
}

export const QuizQuestionScene: React.FC<Props> = ({ question, questionNumber, totalQuestions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isRevealed = frame >= REVEAL_START;

  const sceneOpacity = interpolate(frame, [QUESTION_FRAMES - 20, QUESTION_FRAMES], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Number badge pop-in
  const badgeScale = spring({ frame, fps, config: { stiffness: 200, damping: 15 } });

  // Image: start fullscreen, shrink to top box
  const imgTop    = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [0, 50],     { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const imgLeft   = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [0, 510],    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const imgWidth  = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [1920, 900], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const imgHeight = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [1080, 510], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const imgRadius = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [0, 12],     { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const imgPad    = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [0, 10],     { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Overlay vignette on fullscreen — fades out as it shrinks
  const vignetteOpacity = interpolate(frame, [0, IMG_FULLSCREEN_END], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // "Which car is this?" text — visible during fullscreen phase
  const labelOpacity = interpolate(frame, [20, 40, IMG_FULLSCREEN_END - 10, IMG_FULLSCREEN_END], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Background fades in as image shrinks
  const bgOpacity = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Timer bar
  const timerProgress = interpolate(frame, [THINK_START, REVEAL_START], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const timerColor = timerProgress > 0.5 ? "#4CAF50" : timerProgress > 0.25 ? "#FFC107" : "#F44336";

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, overflow: "hidden" }}>

      {/* Background — fades in after fullscreen phase */}
      <AbsoluteFill style={{
        background: "linear-gradient(160deg, #0a1a6e 0%, #1a237e 40%, #0d47a1 100%)",
        opacity: bgOpacity,
      }} />

      {/* Car image — starts fullscreen, then moves to box */}
      <div style={{
        position: "absolute",
        top: imgTop,
        left: imgLeft,
        width: imgWidth,
        backgroundColor: "#fff",
        borderRadius: imgRadius,
        padding: imgPad,
        boxShadow: frame >= SHRINK_END ? "0 8px 40px rgba(0,0,0,0.5)" : "none",
      }}>
        <Img
          src={resolveImage(question.image)}
          style={{
            width: "100%",
            height: imgHeight,
            objectFit: "cover",
            borderRadius: Math.max(0, imgRadius - 4),
            display: "block",
          }}
        />
        {/* Vignette overlay (fullscreen phase only) */}
        {frame < SHRINK_END && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)",
            opacity: vignetteOpacity,
          }} />
        )}
      </div>

      {/* "Which car is this?" — fullscreen phase */}
      <div style={{
        position: "absolute",
        bottom: 120,
        left: 0,
        right: 0,
        textAlign: "center",
        opacity: labelOpacity,
        zIndex: 5,
      }}>
        <div style={{
          display: "inline-block",
          backgroundColor: "rgba(0,0,0,0.55)",
          borderRadius: 12,
          padding: "16px 60px",
        }}>
          <span style={{
            fontSize: 48,
            fontWeight: 900,
            color: "#fff",
            fontFamily: "'Arial Black', 'Arial', sans-serif",
            letterSpacing: 6,
            textTransform: "uppercase",
            textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          }}>
            Which car is this?
          </span>
        </div>
      </div>

      {/* Question number badge — appears after shrink */}
      <div style={{
        position: "absolute",
        top: 36,
        left: 48,
        width: 90,
        height: 90,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #ef5350, #b71c1c)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${badgeScale})`,
        opacity: bgOpacity,
        zIndex: 10,
      }}>
        <span style={{ fontSize: 48, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
          {questionNumber}
        </span>
      </div>

      {/* Counter top right */}
      <div style={{
        position: "absolute", top: 52, right: 48,
        color: "rgba(255,255,255,0.7)", fontSize: 22,
        fontWeight: 700, letterSpacing: 2,
        opacity: bgOpacity, zIndex: 10,
      }}>
        {questionNumber} / {totalQuestions}
      </div>

      {/* Timer bar */}
      <div style={{
        position: "absolute", top: 600, left: "50%",
        transform: "translateX(-50%)",
        width: 900, height: 6,
        backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999,
        opacity: bgOpacity,
      }}>
        <div style={{
          height: "100%", width: `${timerProgress * 100}%`,
          backgroundColor: timerColor, borderRadius: 999,
        }} />
      </div>

      {/* Answer options 2×2 grid */}
      <div style={{
        position: "absolute",
        top: 628,
        left: "50%",
        transform: "translateX(-50%)",
        width: 1100,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 18,
      }}>
        {question.options.map((option, index) => {
          const appearFrame = ANSWERS_START + index * ANSWER_STAGGER;
          const opacity = interpolate(frame, [appearFrame, appearFrame + 18], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const translateY = interpolate(frame, [appearFrame, appearFrame + 18], [20, 0], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const isCorrect = index === question.correctIndex;
          const correctScale = isRevealed && isCorrect
            ? spring({ frame: frame - REVEAL_START, fps, config: { stiffness: 200, damping: 15 } }) * 0.05 + 1
            : 1;

          let bg = "#ffffff";
          let border = "3px solid transparent";
          let textOpacity = 1;

          if (isRevealed) {
            if (isCorrect) { bg = "#E8F5E9"; border = "3px solid #43A047"; }
            else { bg = "rgba(255,255,255,0.45)"; textOpacity = 0.4; }
          }

          return (
            <div key={index} style={{
              opacity,
              transform: `translateY(${translateY}px) scale(${correctScale})`,
              backgroundColor: bg,
              border,
              borderRadius: 14,
              padding: "20px 24px",
              display: "flex",
              alignItems: "center",
              gap: 20,
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 8,
                backgroundColor: isRevealed && !isCorrect ? "rgba(100,100,100,0.3)" : BADGE_COLORS[index],
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 26, fontWeight: 900, color: "#fff",
              }}>
                {isRevealed && isCorrect ? "✓" : OPTION_LABELS[index]}
              </div>
              <span style={{
                fontSize: 30, fontWeight: 800, color: "#1a1a2e",
                opacity: textOpacity, lineHeight: 1.15,
              }}>
                {isRevealed && isCorrect ? `${question.year} ${option}` : option}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fun fact */}
      {isRevealed && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          opacity: interpolate(frame, [FACT_START, FACT_START + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          backgroundColor: "rgba(0,0,0,0.55)",
          borderTop: "1px solid rgba(255,255,255,0.15)",
          padding: "14px 60px",
        }}>
          <span style={{ fontSize: 22, color: "rgba(255,255,255,0.9)", fontFamily: "'Arial', sans-serif", fontStyle: "italic" }}>
            💡 {question.funFact}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
