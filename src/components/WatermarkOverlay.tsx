import { memo } from "react";

interface WatermarkOverlayProps {
  /** URL of custom watermark PNG, or undefined to use default */
  watermarkUrl?: string;
}

const DEFAULT_WATERMARK = "/watermark-default.png";

/**
 * Pure CSS watermark overlay — single full-cover image.
 * No repeat, no opacity changes — respects the original PNG 100%.
 * Place inside a `position: relative` container.
 */
const WatermarkOverlay = memo(({ watermarkUrl }: WatermarkOverlayProps) => {
  const src = watermarkUrl || DEFAULT_WATERMARK;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
    />
  );
});

WatermarkOverlay.displayName = "WatermarkOverlay";

export default WatermarkOverlay;
