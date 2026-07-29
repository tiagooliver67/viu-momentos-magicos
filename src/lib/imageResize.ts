/**
 * Client-side image resizer + watermark baker.
 * Returns a JPEG Blob with watermark permanently composited.
 */

import type { WatermarkLayerDb } from "@/lib/watermarkLayers";

/** Load an image from a URL and return the HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Desenha as camadas de `watermark_configs` no canvas com a MESMA semântica da
 * Lambda viufoto-image-processor (modos standard / repeated / full_fill).
 * Mantido em sincronia com `buildLayerComposites()` da Lambda.
 */
async function drawWatermarkLayers(
  ctx: CanvasRenderingContext2D,
  layers: WatermarkLayerDb[],
  canvasW: number,
  canvasH: number
): Promise<void> {
  for (const layer of layers) {
    const src = layer.image_url;
    if (!src) continue;

    let wm: HTMLImageElement;
    try {
      wm = await loadImage(src);
    } catch {
      console.warn("[imageResize] Camada ignorada (falha ao carregar):", src);
      continue;
    }

    const opacity = Math.max(0, Math.min(100, layer.opacity ?? 100)) / 100;
    const mode = layer.mode || "standard";

    ctx.save();
    ctx.globalAlpha = opacity;

    if (mode === "full_fill") {
      // Cobertura total (object-fit: cover), equivalente ao fit:'cover' do Sharp.
      const wmAspect = wm.width / wm.height;
      const canvasAspect = canvasW / canvasH;
      let drawW: number, drawH: number;
      if (wmAspect > canvasAspect) {
        drawH = canvasH;
        drawW = canvasH * wmAspect;
      } else {
        drawW = canvasW;
        drawH = canvasW / wmAspect;
      }
      ctx.drawImage(wm, (canvasW - drawW) / 2, (canvasH - drawH) / 2, drawW, drawH);
      ctx.restore();
      continue;
    }

    const sizePct = Math.max(1, Math.min(200, layer.size ?? 30));
    const unitW = Math.max(1, Math.round((canvasW * sizePct) / 100));
    const unitH = Math.max(1, Math.round(unitW * (wm.height / wm.width)));
    const rotation = ((layer.rotation || 0) * Math.PI) / 180;

    const drawUnit = (cx: number, cy: number) => {
      ctx.save();
      ctx.translate(cx, cy);
      if (rotation) ctx.rotate(rotation);
      ctx.drawImage(wm, -unitW / 2, -unitH / 2, unitW, unitH);
      ctx.restore();
    };

    if (mode === "repeated") {
      const spacing = Math.max(0, layer.spacing ?? 40);
      const stepX = unitW + spacing;
      const stepY = unitH + spacing;
      const cols = Math.ceil(canvasW / stepX) + 1;
      const rows = Math.ceil(canvasH / stepY) + 1;
      let count = 0;
      for (let r = 0; r < rows && count < 400; r++) {
        for (let c = 0; c < cols && count < 400; c++) {
          drawUnit(c * stepX + unitW / 2 - spacing / 2, r * stepY + unitH / 2 - spacing / 2);
          count++;
        }
      }
    } else {
      // standard: uma aplicação na posição escolhida.
      const [v, h] = String(layer.position || "center").split("-");
      const cy = v === "top" ? unitH / 2 : v === "bottom" ? canvasH - unitH / 2 : canvasH / 2;
      const cx = h === "left" ? unitW / 2 : h === "right" ? canvasW - unitW / 2 : canvasW / 2;
      drawUnit(cx, cy);
    }

    ctx.restore();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.type === "image/webp") return resolve(blob);
        canvas.toBlob(
          (jpg) => (jpg ? resolve(jpg) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          quality
        );
      },
      "image/webp",
      quality
    );
  });
}

/**
 * Fallback client-side com as camadas configuradas para o evento
 * (mesma saída visual da Lambda). Usado quando o CDN/Lambda não está ativo.
 */
export async function resizeImageWithLayers(
  file: File,
  maxWidth: number,
  layers: WatermarkLayerDb[],
  quality = 0.78
): Promise<Blob> {
  const fileUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(fileUrl);
  } finally {
    URL.revokeObjectURL(fileUrl);
  }

  const ratio = Math.min(maxWidth / img.width, 1);
  const newW = Math.round(img.width * ratio);
  const newH = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, newW, newH);

  await drawWatermarkLayers(ctx, layers, newW, newH);

  return canvasToBlob(canvas, quality);
}

/**
 * Resize an image file to maxWidth and bake a watermark into it.
 * The watermark is permanently composited — cannot be removed.
 */
export async function resizeImageWithWatermark(
  file: File,
  maxWidth: number,
  watermarkSrc: string,
  quality = 0.78
): Promise<Blob> {
  // Load both images in parallel
  const fileUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  let wmImg: HTMLImageElement | null = null;

  try {
    const results = await Promise.allSettled([
      loadImage(fileUrl),
      loadImage(watermarkSrc),
    ]);

    if (results[0].status === "rejected") throw results[0].reason;
    img = results[0].value;

    if (results[1].status === "fulfilled") {
      wmImg = results[1].value;
    } else {
      console.warn("[imageResize] Failed to load watermark, proceeding without it");
    }
  } finally {
    URL.revokeObjectURL(fileUrl);
  }

  // Calculate dimensions
  const ratio = Math.min(maxWidth / img.width, 1);
  const newW = Math.round(img.width * ratio);
  const newH = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";

  // Draw the photo
  ctx.drawImage(img, 0, 0, newW, newH);

  // Bake watermark on top (full coverage, object-fit: cover style)
  if (wmImg) {
    // Scale watermark to cover the entire canvas
    const wmAspect = wmImg.width / wmImg.height;
    const canvasAspect = newW / newH;
    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (wmAspect > canvasAspect) {
      // Watermark is wider — fit by height
      drawH = newH;
      drawW = newH * wmAspect;
      drawX = (newW - drawW) / 2;
      drawY = 0;
    } else {
      // Watermark is taller — fit by width
      drawW = newW;
      drawH = newW / wmAspect;
      drawX = 0;
      drawY = (newH - drawH) / 2;
    }

    ctx.drawImage(wmImg, drawX, drawY, drawW, drawH);
  }

  return new Promise((resolve, reject) => {
    // Prefer WebP (≈30% smaller than JPEG at equivalent quality).
    // Fallback to JPEG if the browser can't encode WebP via canvas.
    canvas.toBlob(
      (blob) => {
        if (blob && blob.type === "image/webp") return resolve(blob);
        canvas.toBlob(
          (jpg) => (jpg ? resolve(jpg) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          quality
        );
      },
      "image/webp",
      quality
    );
  });
}

/**
 * Simple resize without watermark (for cases where watermark is not needed).
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  quality = 0.78
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1);
      const newW = Math.round(img.width * ratio);
      const newH = Math.round(img.height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, newW, newH);
      const finish = (blob: Blob | null) => {
        URL.revokeObjectURL(img.src);
        blob ? resolve(blob) : reject(new Error("toBlob failed"));
      };
      canvas.toBlob(
        (blob) => {
          if (blob && blob.type === "image/webp") return finish(blob);
          canvas.toBlob((jpg) => finish(jpg), "image/jpeg", quality);
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image for resize"));
    };
    img.src = URL.createObjectURL(file);
  });
}
