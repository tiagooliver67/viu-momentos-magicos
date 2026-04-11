import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface WatermarkCanvasProps {
  src: string;
  watermarkText?: string;
  watermarkUrl?: string;
  watermarkPosition?: "center" | "tile" | "corner";
  watermarkOpacity?: number; // 0-100
  watermarkSize?: number; // % of image width
  className?: string;
  onClick?: () => void;
}

const WatermarkCanvas = ({
  src,
  watermarkText = "VIUFOTO",
  watermarkUrl,
  watermarkPosition = "tile",
  watermarkOpacity = 25,
  watermarkSize = 30,
  className,
  onClick,
}: WatermarkCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setStatus("loading");
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const alpha = Math.min(Math.max(watermarkOpacity, 0), 100) / 100;
      const sizeRatio = Math.min(Math.max(watermarkSize, 5), 80) / 100;

      if (watermarkUrl) {
        const wmImg = new Image();
        wmImg.crossOrigin = "anonymous";
        wmImg.onload = () => {
          ctx.globalAlpha = alpha;
          const wmW = img.width * sizeRatio;
          const wmH = (wmImg.height / wmImg.width) * wmW;

          if (watermarkPosition === "tile") {
            for (let y = 0; y < img.height; y += wmH * 2) {
              for (let x = 0; x < img.width; x += wmW * 2) {
                ctx.drawImage(wmImg, x, y, wmW, wmH);
              }
            }
          } else if (watermarkPosition === "center") {
            const cx = (img.width - wmW) / 2;
            const cy = (img.height - wmH) / 2;
            ctx.drawImage(wmImg, cx, cy, wmW, wmH);
          } else {
            // corner (bottom-right)
            ctx.drawImage(wmImg, img.width - wmW - 20, img.height - wmH - 20, wmW, wmH);
          }
          ctx.globalAlpha = 1;
          setStatus("loaded");
        };
        wmImg.onerror = () => setStatus("loaded"); // still show image without watermark
        wmImg.src = watermarkUrl;
      } else {
        // Text watermark
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        const fontSize = Math.max(img.width * 0.05, 16);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";

        if (watermarkPosition === "tile") {
          ctx.save();
          ctx.translate(img.width / 2, img.height / 2);
          ctx.rotate(-Math.PI / 6);
          const spacing = fontSize * 3;
          for (let y = -img.height; y < img.height * 2; y += spacing) {
            for (let x = -img.width; x < img.width * 2; x += spacing) {
              ctx.fillText(watermarkText, x - img.width / 2, y - img.height / 2);
            }
          }
          ctx.restore();
        } else if (watermarkPosition === "center") {
          ctx.fillText(watermarkText, img.width / 2, img.height / 2);
        } else {
          ctx.textAlign = "right";
          ctx.fillText(watermarkText, img.width - 30, img.height - 30);
        }
        ctx.globalAlpha = 1;
        setStatus("loaded");
      }
    };

    img.onerror = () => setStatus("error");
    img.src = src;
  };

  useEffect(() => {
    draw();
  }, [src, watermarkText, watermarkUrl, watermarkPosition, watermarkOpacity, watermarkSize]);

  return (
    <div className={`relative ${className || ""}`} onClick={onClick} style={{ cursor: onClick ? "pointer" : undefined }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ objectFit: "cover", display: status === "loaded" ? "block" : "none" }}
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/30">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/30 gap-2">
          <p className="text-xs text-muted-foreground">Erro ao carregar</p>
          <button
            onClick={(e) => { e.stopPropagation(); draw(); }}
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            <RefreshCw className="w-3 h-3" /> Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
};

export default WatermarkCanvas;
