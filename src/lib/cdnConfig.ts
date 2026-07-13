/**
 * CDN Configuration for ViuFoto image delivery.
 *
 * When VITE_CDN_BASE_URL is set (e.g. https://cdn.viufoto.com),
 * thumb and medium images are served directly from CloudFront — no signed URLs needed.
 * Original images always use signed URLs (private access post-purchase).
 *
 * When not set, all images fall back to S3 signed URLs via the s3-presign edge function.
 */

/**
 * CloudFront base URL.
 * It must be configured explicitly in the environment after the derivative pipeline
 * (thumb/medium generation) is actually online.
 */
const CDN_BASE = (import.meta.env.VITE_CDN_BASE_URL as string | undefined)?.trim() || null;

/**
 * Whether the derivative pipeline is explicitly enabled.
 * A bare CDN URL is not enough — the backend processor must exist and be live.
 */
export const IS_LAMBDA_PIPELINE_ACTIVE =
  import.meta.env.VITE_ENABLE_DERIVATIVE_CDN === "true" && !!CDN_BASE;

/** Build a public CDN URL for an S3 object path */
export function cdnUrl(objectPath: string): string | null {
  if (!CDN_BASE) return null;
  const base = CDN_BASE.replace(/\/+$/, "");
  const path = objectPath.replace(/^\/+/, "");
  return `${base}/${path}`;
}

/** True when the value is a storage object key instead of an absolute URL */
export function isStoragePath(objectPath: string): boolean {
  return objectPath.startsWith("eventos/") || objectPath.startsWith("usuarios/");
}

/** Derive thumb path from original — always /thumb/<nome-original>.webp (preserva caixa) */
export function toThumbPath(originalPath: string): string {
  const lastSlash = originalPath.lastIndexOf("/");
  if (lastSlash === -1) return originalPath;
  const dir = originalPath.substring(0, lastSlash);
  const filename = originalPath.substring(lastSlash + 1).replace(/\.[^.]+$/, ".webp");
  return `${dir}/thumb/${filename}`;
}

/** Derive medium path from original — always /medium/<nome-original>.webp (preserva caixa) */
export function toMediumPath(originalPath: string): string {
  const lastSlash = originalPath.lastIndexOf("/");
  if (lastSlash === -1) return originalPath;
  const dir = originalPath.substring(0, lastSlash);
  const filename = originalPath.substring(lastSlash + 1).replace(/\.[^.]+$/, ".webp");
  return `${dir}/medium/${filename}`;
}

/**
 * Get display URL for a photo in the grid (thumb).
 * Returns CDN URL if available, otherwise null (caller should use signed URL).
 */
export function getThumbCdnUrl(originalPath: string): string | null {
  return cdnUrl(toThumbPath(originalPath));
}

/**
 * Get display URL for lightbox (medium).
 * Returns CDN URL if available, otherwise null (caller should use signed URL).
 */
export function getMediumCdnUrl(originalPath: string): string | null {
  return cdnUrl(toMediumPath(originalPath));
}

/**
 * Vídeos: o Lambda viufoto-video-processor já grava os caminhos resolvidos
 * de thumbnail/poster/preview como colunas separadas em event_videos (não
 * seguem um padrão derivável do file_url original como as fotos), então
 * aqui só precisamos resolver o path já pronto para uma URL pública/assinada.
 */
export function getVideoDerivativeCdnUrl(derivativePath: string | null | undefined): string | null {
  if (!derivativePath) return null;
  return cdnUrl(derivativePath);
}
