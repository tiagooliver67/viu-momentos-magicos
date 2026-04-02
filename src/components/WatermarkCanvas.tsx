import { useEffect, useRef, useState } from "react";

interface WatermarkCanvasProps {
  src: string;
  watermarkText?: string;
  watermarkUrl?: string;
  className?: string;
  onClick?: () => void;
}

const WatermarkCanvas = ({ src, watermarkText = "VIUFOTO", watermarkUrl, className, onClick }: WatermarkCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      setDimensions({ width: img.width, height: img.height });
      ctx.drawImage(img, 0, 0);

      if (watermarkUrl) {
        const wmImg = new Image();
        wmImg.crossOrigin = "anonymous";
        wmImg.onload = () => {
          ctx.globalAlpha = 0.4;
          const wmW = img.width * 0.3;
          const wmH = (wmImg.height / wmImg.width) * wmW;
          // Tile watermark
          for (let y = 0; y < img.height; y += wmH * 2) {
            for (let x = 0; x < img.width; x += wmW * 2) {
              ctx.drawImage(wmImg, x, y, wmW, wmH);
            }
          }
          ctx.globalAlpha = 1;
        };
        wmImg.src = watermarkUrl;
      } else {
        // Text watermark
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#ffffff";
        const fontSize = Math.max(img.width * 0.05, 16);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.save();
        ctx.translate(img.width / 2, img.height / 2);
        ctx.rotate(-Math.PI / 6);
        const text = watermarkText;
        const spacing = fontSize * 3;
        for (let y = -img.height; y < img.height * 2; y += spacing) {
          for (let x = -img.width; x < img.width * 2; x += spacing) {
            ctx.fillText(text, x - img.width / 2, y - img.height / 2);
          }
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    };
    img.src = src;
  }, [src, watermarkText, watermarkUrl]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onClick={onClick}
      style={{ width: "100%", height: "100%", objectFit: "cover", cursor: onClick ? "pointer" : undefined }}
    />
  );
};

export default WatermarkCanvas;
