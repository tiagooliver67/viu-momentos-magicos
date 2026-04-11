/**
 * Client-side image resizer using OffscreenCanvas (or Canvas fallback).
 * Returns a Blob of the resized JPEG image.
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // If image is already smaller, return as-is as JPEG
      if (img.width <= maxWidth) {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          quality
        );
        return;
      }

      const ratio = maxWidth / img.width;
      const newW = maxWidth;
      const newH = Math.round(img.height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, newW, newH);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image for resize"));
    img.src = URL.createObjectURL(file);
  });
}
