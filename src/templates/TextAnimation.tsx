import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface TextAnimationProps {
  text: string;
  style: "typewriter" | "fade-words" | "bounce-in";
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
}

const TypewriterText: React.FC<{
  text: string;
  fontSize: number;
  fontColor: string;
  textAlign: string;
}> = ({ text, fontSize, fontColor, textAlign }) => {
  const frame = useCurrentFrame();

  // 3 frames per character
  const charsVisible = Math.floor(frame / 3);
  const displayedText = text.slice(0, charsVisible);
  const showCursor = frame % 16 < 10;

  return (
    <div
      style={{
        fontSize,
        fontWeight: 600,
        color: fontColor,
        textAlign: textAlign as React.CSSProperties["textAlign"],
        fontFamily: "Inter, Noto Sans, monospace",
        lineHeight: 1.4,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxWidth: "85%",
      }}
    >
      {displayedText}
      <span
        style={{
          opacity: showCursor && charsVisible <= text.length ? 1 : 0,
          borderRight: `3px solid ${fontColor}`,
          marginLeft: 2,
        }}
      />
    </div>
  );
};

const FadeWordsText: React.FC<{
  text: string;
  fontSize: number;
  fontColor: string;
  textAlign: string;
}> = ({ text, fontSize, fontColor, textAlign }) => {
  const frame = useCurrentFrame();

  const words = text.split(/\s+/).filter(Boolean);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent:
          textAlign === "center"
            ? "center"
            : textAlign === "right"
            ? "flex-end"
            : "flex-start",
        gap: "0 18px",
        maxWidth: "85%",
        lineHeight: 1.5,
      }}
    >
      {words.map((word, i) => {
        const delay = i * 10;
        const opacity = interpolate(
          frame,
          [delay, delay + 15],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const translateY = interpolate(
          frame,
          [delay, delay + 15],
          [20, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        return (
          <span
            key={i}
            style={{
              opacity,
              transform: `translateY(${translateY}px)`,
              fontSize,
              fontWeight: 600,
              color: fontColor,
              fontFamily: "Inter, Noto Sans, sans-serif",
              display: "inline-block",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

const BounceInText: React.FC<{
  text: string;
  fontSize: number;
  fontColor: string;
  textAlign: string;
}> = ({ text, fontSize, fontColor, textAlign }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = text.split(/\s+/).filter(Boolean);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent:
          textAlign === "center"
            ? "center"
            : textAlign === "right"
            ? "flex-end"
            : "flex-start",
        gap: "0 18px",
        maxWidth: "85%",
        lineHeight: 1.5,
      }}
    >
      {words.map((word, i) => {
        const delay = i * 12;
        const s = spring({
          frame: Math.max(0, frame - delay),
          fps,
          config: {
            damping: 10,
            stiffness: 120,
            overshootClamping: false,
          },
        });

        const scaleVal = interpolate(s, [0, 1], [0, 1]);
        const opacity = interpolate(s, [0, 0.3], [0, 1], {
          extrapolateRight: "clamp",
        });

        return (
          <span
            key={i}
            style={{
              opacity,
              transform: `scale(${scaleVal})`,
              fontSize,
              fontWeight: 700,
              color: fontColor,
              fontFamily: "Inter, Noto Sans, sans-serif",
              display: "inline-block",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

export const TextAnimation: React.FC<TextAnimationProps> = ({
  text,
  style,
  fontSize,
  fontColor,
  backgroundColor,
  textAlign,
}) => {
  const safeText = text || "";
  const safeFontSize = fontSize || 72;
  const safeFontColor = fontColor || "#FFFFFF";
  const safeBgColor = backgroundColor || "#1a1a2e";
  const safeAlign = textAlign || "center";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: safeBgColor,
        justifyContent: "center",
        alignItems: "center",
        padding: "60px",
      }}
    >
      {style === "typewriter" && (
        <TypewriterText
          text={safeText}
          fontSize={safeFontSize}
          fontColor={safeFontColor}
          textAlign={safeAlign}
        />
      )}
      {style === "fade-words" && (
        <FadeWordsText
          text={safeText}
          fontSize={safeFontSize}
          fontColor={safeFontColor}
          textAlign={safeAlign}
        />
      )}
      {style === "bounce-in" && (
        <BounceInText
          text={safeText}
          fontSize={safeFontSize}
          fontColor={safeFontColor}
          textAlign={safeAlign}
        />
      )}
    </AbsoluteFill>
  );
};
