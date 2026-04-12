import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface ImageSlideshowProps {
  images: string[];
  transitionType: "fade" | "slide" | "zoom";
  secondsPerImage: number;
  title?: string;
  musicUrl?: string;
}

const TRANSITION_FRAMES = 15;

const SlideImage: React.FC<{
  src: string;
  transitionType: "fade" | "slide" | "zoom";
  frameDuration: number;
}> = ({ src, transitionType, frameDuration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ken-Burns effect per image
  const kenBurns = interpolate(frame, [0, frameDuration], [1, 1.15], {
    extrapolateRight: "clamp",
  });

  // Transition-in
  let inOpacity = 1;
  let inTranslateX = 0;
  let inScale = 1;

  if (transitionType === "fade") {
    inOpacity = interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], {
      extrapolateRight: "clamp",
    });
  } else if (transitionType === "slide") {
    inTranslateX = interpolate(frame, [0, TRANSITION_FRAMES], [1080, 0], {
      extrapolateRight: "clamp",
    });
  } else if (transitionType === "zoom") {
    inScale = interpolate(frame, [0, TRANSITION_FRAMES], [0.5, 1], {
      extrapolateRight: "clamp",
    });
    inOpacity = interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], {
      extrapolateRight: "clamp",
    });
  }

  return (
    <AbsoluteFill
      style={{
        opacity: inOpacity,
        transform: `translateX(${inTranslateX}px) scale(${inScale})`,
      }}
    >
      {src ? (
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${kenBurns})`,
          }}
        />
      ) : (
        <AbsoluteFill style={{ backgroundColor: "#333" }} />
      )}
    </AbsoluteFill>
  );
};

export const ImageSlideshow: React.FC<ImageSlideshowProps> = ({
  images,
  transitionType,
  secondsPerImage,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const safeImages = images && images.length > 0 ? images : [];
  const framesPerImage = (secondsPerImage || 3) * fps;

  // Title fade-in at the very start
  const titleOpacity = interpolate(frame, [0, 20, 50, 70], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {safeImages.map((imgSrc, index) => (
        <Sequence
          key={index}
          from={index * framesPerImage}
          durationInFrames={framesPerImage + TRANSITION_FRAMES}
        >
          <SlideImage
            src={imgSrc}
            transitionType={transitionType}
            frameDuration={framesPerImage}
          />
        </Sequence>
      ))}

      {/* Optional title overlay at the start */}
      {title ? (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              opacity: titleOpacity,
              fontSize: 64,
              fontWeight: 700,
              color: "#FFFFFF",
              textAlign: "center",
              fontFamily: "Inter, Noto Sans, sans-serif",
              textShadow: "0 4px 20px rgba(0,0,0,0.7)",
              padding: "0 60px",
            }}
          >
            {title}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
