/**
 * Client-side image resizer + watermark baker.
 * Returns a JPEG Blob with watermark permanently composited.
 */

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
