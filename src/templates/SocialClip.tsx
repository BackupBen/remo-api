import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface SocialClipProps {
  title: string;
  subtitle: string;
  backgroundImage: string;
  accentColor: string;
}

export const SocialClip: React.FC<SocialClipProps> = ({
  title,
  subtitle,
  backgroundImage,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Ken-Burns zoom: scale 1 → 1.2 over entire duration
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.2], {
    extrapolateRight: "clamp",
  });

  // Title animation: spring bounce from frame 15
  const titleSpring = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleTranslateY = interpolate(titleSpring, [0, 1], [60, 0]);

  // Subtitle animation: spring from frame 30
  const subtitleSpring = spring({
    frame: Math.max(0, frame - 30),
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  const subtitleOpacity = interpolate(subtitleSpring, [0, 1], [0, 1]);
  const subtitleTranslateY = interpolate(subtitleSpring, [0, 1], [40, 0]);

  // Accent line animation
  const accentWidth = interpolate(titleSpring, [0, 1], [0, 200]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        overflow: "hidden",
      }}
    >
      {/* Background Image with Ken-Burns */}
      {backgroundImage ? (
        <AbsoluteFill>
          <Img
            src={backgroundImage}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale})`,
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: `linear-gradient(135deg, ${accentColor}44, #000)`,
          }}
        />
      )}

      {/* Dark overlay */}
      <AbsoluteFill
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.55)",
        }}
      />

      {/* Text content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "60px",
        }}
      >
        {/* Title */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
            fontSize: 72,
            fontWeight: 800,
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 1.2,
            fontFamily: "Inter, Noto Sans, sans-serif",
          }}
        >
          {title || ""}
        </div>

        {/* Accent line under title */}
        <div
          style={{
            width: accentWidth,
            height: 6,
            backgroundColor: accentColor,
            borderRadius: 3,
            marginTop: 24,
            marginBottom: 24,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleOpacity,
            transform: `translateY(${subtitleTranslateY}px)`,
            fontSize: 36,
            fontWeight: 400,
            color: "#FFFFFFCC",
            textAlign: "center",
            lineHeight: 1.4,
            fontFamily: "Inter, Noto Sans, sans-serif",
          }}
        >
          {subtitle || ""}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
