import { memo } from "react";

interface WatermarkOverlayProps {
  /** URL of custom watermark PNG, or undefined to use default */
  watermarkUrl?: string;
  position?: "center" | "tile" | "corner";
  opacity?: number; // 0-100
  size?: number; // % of container width
}

const DEFAULT_WATERMARK = "/watermark-default.png";

/**
 * Pure CSS watermark overlay — no Canvas, no heavy processing.
 * Place inside a `position: relative` container.
 */
const WatermarkOverlay = memo(({
  watermarkUrl,
  position = "tile",
  opacity = 25,
  size = 30,
}: WatermarkOverlayProps) => {
  const src = watermarkUrl || DEFAULT_WATERMARK;
  const alpha = Math.min(Math.max(opacity, 0), 100) / 100;
  const sizePercent = Math.min(Math.max(size, 5), 80);

  if (position === "tile") {
    // Repeating background image
    return (
      <div
        className="absolute inset-0 pointer-events-none select-none"
        aria-hidden="true"
        style={{
          backgroundImage: `url(${src})`,
          backgroundRepeat: "repeat",
          backgroundSize: `${sizePercent}% auto`,
          backgroundPosition: "center",
          opacity: alpha,
        }}
      />
    );
  }

  if (position === "center") {
    return (
      <div
        className="absolute inset-0 pointer-events-none select-none flex items-center justify-center"
        aria-hidden="true"
        style={{ opacity: alpha }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{ width: `${sizePercent}%`, height: "auto" }}
        />
      </div>
    );
  }

  // corner (bottom-right)
  return (
    <div
      className="absolute bottom-3 right-3 pointer-events-none select-none"
      aria-hidden="true"
      style={{ opacity: alpha }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        style={{ width: `${sizePercent}%`, maxWidth: "200px", height: "auto" }}
      />
    </div>
  );
});

WatermarkOverlay.displayName = "WatermarkOverlay";

export default WatermarkOverlay;
