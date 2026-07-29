import { memo, useCallback, useRef, useState } from "react";

export type BlurPattern = "diagonal" | "vertical" | "horizontal" | "circular" | "faixa";

interface BlurProtectionOverlayProps {
  pattern: BlurPattern;
  imageUrl: string;
  /** Optional alt text for the revealed image */
  alt?: string;
  className?: string;
  /** Extra classes applied to the <img> elements (object-fit etc.) */
  imageClassName?: string;
  /** Show the "toque e mova" hint until the user interacts */
  showHint?: boolean;
  /** Blur intensity in px */
  blurPx?: number;
}

/**
 * Camada extra de proteção visual (client-side).
 * A imagem é exibida desfocada e apenas uma região acompanha o dedo/cursor,
 * revelando parte da foto por vez. A marca d'água do servidor continua intacta.
 */
const clipFor = (pattern: BlurPattern, x: number, y: number): string => {
  const px = Math.max(0, Math.min(100, x));
  const py = Math.max(0, Math.min(100, y));
  switch (pattern) {
    case "vertical":
      // revela metade da imagem na vertical (do topo até a linha, corte vertical)
      return `inset(0% ${100 - px}% 0% 0%)`;
    case "horizontal":
      return `inset(0% 0% ${100 - py}% 0%)`;
    case "circular":
      return `circle(22% at ${px}% ${py}%)`;
    case "diagonal":
      return `polygon(0% 0%, ${Math.min(100, px + 35)}% 0%, ${Math.max(0, px - 35)}% 100%, 0% 100%)`;
    case "faixa":
    default:
      return `inset(0% ${Math.max(0, 100 - px - 14)}% 0% ${Math.max(0, px - 14)}%)`;
  }
};

const BlurProtectionOverlay = memo(({
  pattern,
  imageUrl,
  alt = "",
  className = "",
  imageClassName = "w-full h-full object-cover",
  showHint = true,
  blurPx = 18,
}: BlurProtectionOverlayProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const update = useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: ((clientX - r.left) / r.width) * 100,
      y: ((clientY - r.top) / r.height) * 100,
    });
  }, []);

  const clipPath = pos ? clipFor(pattern, pos.x, pos.y) : "inset(0 100% 0 0)";

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden select-none ${className}`}
      onTouchStart={(e) => update(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => update(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={() => setPos(null)}
      onMouseMove={(e) => update(e.clientX, e.clientY)}
      onMouseLeave={() => setPos(null)}
    >
      <img
        src={imageUrl}
        alt={alt}
        draggable={false}
        loading="lazy"
        className={`${imageClassName} pointer-events-none`}
        style={{ filter: `blur(${blurPx}px)`, transform: "scale(1.06)" }}
      />
      <img
        src={imageUrl}
        alt=""
        aria-hidden="true"
        draggable={false}
        loading="lazy"
        className={`absolute inset-0 ${imageClassName} pointer-events-none transition-[clip-path] duration-75`}
        style={{ clipPath, WebkitClipPath: clipPath } as React.CSSProperties}
      />
      {showHint && !pos && (
        <div className="absolute inset-x-3 bottom-3 pointer-events-none">
          <div className="flex items-center gap-2 rounded-xl bg-foreground/80 text-background px-3 py-2 text-xs font-medium backdrop-blur-sm">
            <span aria-hidden="true">✋</span>
            <span>Toque na tela e mova o dedo para revelar a foto</span>
          </div>
        </div>
      )}
    </div>
  );
});

BlurProtectionOverlay.displayName = "BlurProtectionOverlay";

export default BlurProtectionOverlay;