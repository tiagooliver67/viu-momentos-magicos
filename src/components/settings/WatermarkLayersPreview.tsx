import { memo } from "react";
import type { WatermarkLayer, WatermarkPosition } from "@/lib/watermarkLayers";

const posStyle: Record<WatermarkPosition, React.CSSProperties> = {
  "top-left": { top: "4%", left: "4%" },
  "top-center": { top: "4%", left: "50%", transform: "translateX(-50%)" },
  "top-right": { top: "4%", right: "4%" },
  "middle-left": { top: "50%", left: "4%", transform: "translateY(-50%)" },
  "center": { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  "middle-right": { top: "50%", right: "4%", transform: "translateY(-50%)" },
  "bottom-left": { bottom: "4%", left: "4%" },
  "bottom-center": { bottom: "4%", left: "50%", transform: "translateX(-50%)" },
  "bottom-right": { bottom: "4%", right: "4%" },
};

const LayerRender = ({ layer }: { layer: WatermarkLayer }) => {
  if (!layer.imageUrl) return null;
  const opacity = layer.opacity / 100;

  if (layer.mode === "fill") {
    return (
      <img
        src={layer.imageUrl}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ opacity, transform: `rotate(${layer.rotation}deg)` }}
      />
    );
  }

  if (layer.mode === "repeat") {
    const tile = layer.size * 3; // px aproximado por repetição no preview
    return (
      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        style={{ opacity }}
      >
        <div
          className="absolute"
          style={{
            top: "-50%", left: "-50%", width: "200%", height: "200%",
            transform: `rotate(${layer.rotation}deg)`,
            backgroundImage: `url(${layer.imageUrl})`,
            backgroundRepeat: "repeat",
            backgroundSize: `${tile + layer.spacing}px auto`,
          }}
        />
      </div>
    );
  }

  const base = posStyle[layer.position] || posStyle.center;
  return (
    <img
      src={layer.imageUrl}
      alt=""
      aria-hidden
      draggable={false}
      className="absolute pointer-events-none select-none object-contain"
      style={{
        ...base,
        width: `${layer.size}%`,
        opacity,
        transform: `${base.transform ? base.transform + " " : ""}rotate(${layer.rotation}deg)`,
      }}
    />
  );
};

interface Props {
  layers: WatermarkLayer[];
  photoUrl: string;
  orientation?: "landscape" | "portrait";
  className?: string;
}

const WatermarkLayersPreview = memo(({ layers, photoUrl, orientation = "landscape", className }: Props) => (
  <div
    className={`relative overflow-hidden rounded-xl bg-muted ${
      orientation === "landscape" ? "aspect-[3/2]" : "aspect-[2/3]"
    } ${className || ""}`}
  >
    <img src={photoUrl} alt="Pré-visualização da marca d'água" className="w-full h-full object-cover" />
    {layers.map(l => <LayerRender key={l.id} layer={l} />)}
  </div>
));

WatermarkLayersPreview.displayName = "WatermarkLayersPreview";
export default WatermarkLayersPreview;
