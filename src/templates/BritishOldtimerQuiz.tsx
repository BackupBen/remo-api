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
  /** Optional: URL zur Voiceover-MP3 */
  voiceoverUrl?: string;
  /** Optional: Dauer des Voiceovers in Sekunden (von n8n berechnet) */
  voiceoverDurationSeconds?: number;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface BritishQuizProps {
  questions: QuizQuestion[];
  /** Pro Frage berechnete Länge in Frames (von calculateMetadata gesetzt) */
  questionDurations?: number[];
  /** Optional: URL zur Hintergrundmusik (MinIO) — wird als Loop abgespielt */
  backgroundMusicUrl?: string;
  /** Schwierigkeitsgrad: easy = volles Bild, medium = halbes Bild, hard = kleiner Ausschnitt */
  difficulty?: Difficulty;
}

// ─── Konstanten ───────────────────────────────────────────────────────────────

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const BADGE_COLOR = "#1565C0";

export const QUESTION_FRAMES = 990;   // Fallback wenn kein Voiceover vorhanden
export const INTRO_FRAMES = 90;       // 3s Intro
export const TRANSITION_FRAMES = 30;  // 1s Übergang zwischen Fragen
export const REVEAL_START = 310;      // Frame ab dem Antwort aufgedeckt wird (für calculateMetadata)

// Timing innerhalb einer Frage (Frames)
const IMG_FULLSCREEN_END = 75;  // Auto bleibt fullscreen bis Frame 75
const SHRINK_END = 105;         // Shrink-Animation fertig bei Frame 105
const ANSWERS_START = 110;
const ANSWER_STAGGER = 18;
const THINK_START = ANSWERS_START + 4 * ANSWER_STAGGER + 20;
const FACT_START = 350;

// ─── Quiz-Frage ───────────────────────────────────────────────────────────────

// Clip-Inset-Werte pro Schwierigkeitsgrad (top, right, bottom, left — in %)
const DIFFICULTY_CLIP: Record<Difficulty, [number, number, number, number]> = {
  easy:   [0,  0,  0,  0],   // volles Bild
  medium: [0,  50, 0,  0],   // linke Hälfte sichtbar
  hard:   [25, 30, 25, 30],  // kleines Fenster in der Mitte (~40%×50%)
};
const DIFFICULTY_BLUR: Record<Difficulty, number> = { easy: 0, medium: 18, hard: 40 };
const DIFFICULTY_LABEL: Record<Difficulty, { text: string; color: string }> = {
  easy:   { text: "EASY",   color: "#43A047" },
  medium: { text: "MEDIUM", color: "#FB8C00" },
  hard:   { text: "HARD",   color: "#E53935" },
};

const QuizQuestionScene: React.FC<{
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  durationInFrames: number;
  difficulty: Difficulty;
}> = ({ question, questionNumber, totalQuestions, durationInFrames, difficulty }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isRevealed = frame >= REVEAL_START;

  // Szene ausblenden — richtet sich nach tatsächlicher Länge
  const sceneOpacity = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Hintergrund faded ein wenn Bild schrumpft
  const bgOpacity = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Bild: startet fullscreen, schrumpft dann in obere Box
  const imgTop    = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [0, 50],     { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const imgLeft   = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [0, 510],    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const imgWidth  = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [1920, 900], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const imgHeight = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [1080, 510], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const imgRadius = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [0, 12],     { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const imgPad    = interpolate(frame, [IMG_FULLSCREEN_END, SHRINK_END], [0, 10],     { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Vignette faded aus wenn Bild schrumpft
  const vignetteOpacity = interpolate(frame, [0, IMG_FULLSCREEN_END], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // "Which car is this?" Text — nur während fullscreen
  const labelOpacity = interpolate(frame, [20, 40, IMG_FULLSCREEN_END - 10, IMG_FULLSCREEN_END], [0, 1, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Timer-Balken
  const timerProgress = interpolate(frame, [THINK_START, REVEAL_START], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const timerColor = timerProgress > 0.5 ? "#4CAF50" : timerProgress > 0.25 ? "#FFC107" : "#F44336";

  // Nummern-Badge pop-in
  const badgeScale = spring({ frame, fps, config: { stiffness: 200, damping: 15 } });

  // ─── Schwierigkeitsgrad-Effekt ─────────────────────────────────────────────
  // Reveal-Animation: clip öffnet sich von REVEAL_START bis REVEAL_START+25
  const revealProgress = interpolate(frame, [REVEAL_START, REVEAL_START + 25], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const [ct, cr, cb, cl] = DIFFICULTY_CLIP[difficulty];
  const clipTop    = interpolate(revealProgress, [0, 1], [ct, 0]);
  const clipRight  = interpolate(revealProgress, [0, 1], [cr, 0]);
  const clipBottom = interpolate(revealProgress, [0, 1], [cb, 0]);
  const clipLeft   = interpolate(revealProgress, [0, 1], [cl, 0]);
  const clipPath   = `inset(${clipTop}% ${clipRight}% ${clipBottom}% ${clipLeft}% round 6px)`;
  const blurNow    = DIFFICULTY_BLUR[difficulty] * (1 - revealProgress);
  const diffLabel  = DIFFICULTY_LABEL[difficulty];
  // Badge faded aus kurz vor dem Reveal
  const diffBadgeOpacity = interpolate(frame, [REVEAL_START - 15, REVEAL_START], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, overflow: "hidden" }}>

      {/* Voiceover — startet beim Reveal (Antwort wird aufgedeckt) */}
      {question.voiceoverUrl && (
        <Sequence from={REVEAL_START}>
          <Audio src={question.voiceoverUrl} />
        </Sequence>
      )}

      {/* Hintergrund — faded ein nach fullscreen-Phase */}
      <AbsoluteFill style={{
        background: "linear-gradient(160deg, #0a1a6e 0%, #1a237e 40%, #0d47a1 100%)",
        opacity: bgOpacity,
      }} />

      {/* Auto-Bild — startet fullscreen, schrumpft dann in weiße Box */}
      <div style={{
        position: "absolute",
        top: imgTop,
        left: imgLeft,
        width: imgWidth,
        backgroundColor: "#fff",
        borderRadius: imgRadius,
        padding: imgPad,
        boxShadow: frame >= SHRINK_END ? "0 8px 40px rgba(0,0,0,0.5)" : "none",
        overflow: "hidden",
      }}>
        {/* Unscharfer Hintergrund (nur bei medium/hard, vor dem Reveal) */}
        {difficulty !== "easy" && blurNow > 0 && (
          <Img
            src={question.image}
            style={{
              position: "absolute",
              top: -10, left: -10, right: -10, bottom: -10,
              width: "calc(100% + 20px)",
              height: imgHeight + 20,
              objectFit: "cover",
              filter: `blur(${blurNow}px)`,
            }}
          />
        )}
        {/* Scharfes Bild — geclippt je nach Schwierigkeitsgrad */}
        <Img
          src={question.image}
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: imgHeight,
            objectFit: "cover",
            borderRadius: Math.max(0, imgRadius - 4),
            display: "block",
            clipPath: difficulty !== "easy" ? clipPath : undefined,
          }}
        />
        {/* Vignette (nur fullscreen-Phase) */}
        {frame < SHRINK_END && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.65) 100%)",
            opacity: vignetteOpacity,
            zIndex: 2,
          }} />
        )}
        {/* Schwierigkeits-Badge */}
        {difficulty !== "easy" && diffBadgeOpacity > 0 && (
          <div style={{
            position: "absolute",
            top: 12, right: 12,
            backgroundColor: diffLabel.color,
            color: "#fff",
            fontSize: 20,
            fontWeight: 900,
            fontFamily: "'Arial Black', sans-serif",
            letterSpacing: 3,
            padding: "6px 16px",
            borderRadius: 8,
            opacity: diffBadgeOpacity,
            zIndex: 3,
            boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
          }}>
            {diffLabel.text}
          </div>
        )}
      </div>

      {/* "Which car is this?" — fullscreen-Phase */}
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

      {/* Fragen-Nummer-Badge — erscheint nach Shrink */}
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

      {/* Zähler oben rechts */}
      <div style={{
        position: "absolute", top: 52, right: 48,
        color: "rgba(255,255,255,0.7)", fontSize: 22,
        fontWeight: 700, letterSpacing: 2,
        opacity: bgOpacity, zIndex: 10,
      }}>
        {questionNumber} / {totalQuestions}
      </div>

      {/* Timer-Balken */}
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

      {/* Antworten 2×2 Grid */}
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
                backgroundColor: isRevealed && !isCorrect ? "rgba(100,100,100,0.3)" : BADGE_COLOR,
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

      {/* Fun Fact */}
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

// ─── Intro-Screen ─────────────────────────────────────────────────────────────

const QuizIntro: React.FC<{ totalQuestions: number }> = ({ totalQuestions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale   = spring({ frame, fps, config: { stiffness: 80, damping: 14 } });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const subOpacity   = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const sceneOpacity = interpolate(frame, [INTRO_FRAMES - 20, INTRO_FRAMES], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(160deg, #0a1a6e 0%, #1a237e 40%, #0d47a1 100%)",
      justifyContent: "center",
      alignItems: "center",
      opacity: sceneOpacity,
    }}>
      {/* Dekorative Kreise */}
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
        <div style={{ marginTop: 48, opacity: subOpacity, fontSize: 28, color: "rgba(255,255,255,0.65)", fontFamily: "'Arial', sans-serif", letterSpacing: 4, fontWeight: 600 }}>
          {totalQuestions} QUESTIONS · CAN YOU IDENTIFY THEM ALL?
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Hauptkomposition ─────────────────────────────────────────────────────────

export const BritishOldtimerQuiz: React.FC<BritishQuizProps> = ({ questions, questionDurations, backgroundMusicUrl, difficulty = "easy" }) => {
  const { durationInFrames } = useVideoConfig();

  // Berechne kumulative Start-Frames pro Frage
  const durations = questions.map((_, i) => questionDurations?.[i] ?? QUESTION_FRAMES);
  const startFrames = durations.reduce<number[]>((acc, dur, i) => {
    acc.push(i === 0 ? INTRO_FRAMES : acc[i - 1] + durations[i - 1] + TRANSITION_FRAMES);
    return acc;
  }, []);

  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #0a1a6e 0%, #1a237e 40%, #0d47a1 100%)" }}>
      {/* Hintergrundmusik (Loop, Fade-in 2s / Fade-out 2s, Volumen 12%) */}
      {backgroundMusicUrl && (
        <Audio
          src={backgroundMusicUrl}
          loop
          volume={(frame) => {
            const fadeIn  = interpolate(frame, [0, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const fadeOut = interpolate(frame, [durationInFrames - 60, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return 0.12 * Math.min(fadeIn, fadeOut);
          }}
        />
      )}

      {/* Intro */}
      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <QuizIntro totalQuestions={questions.length} />
      </Sequence>

      {/* Fragen */}
      {questions.map((question, index) => {
        const dur = durations[index];
        return (
          <Sequence key={index} from={startFrames[index]} durationInFrames={dur}>
            <QuizQuestionScene
              question={question}
              questionNumber={index + 1}
              totalQuestions={questions.length}
              durationInFrames={dur}
              difficulty={difficulty}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
