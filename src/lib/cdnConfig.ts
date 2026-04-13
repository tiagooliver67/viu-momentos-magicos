/**
 * CDN Configuration for ViuFoto image delivery.
 *
 * When VITE_CDN_BASE_URL is set (e.g. https://cdn.viufoto.com),
 * thumb and medium images are served directly from CloudFront — no signed URLs needed.
 * Original images always use signed URLs (private access post-purchase).
 *
 * When not set, all images fall back to S3 signed URLs via the s3-presign edge function.
 */

/** CloudFront base URL — set in .env as VITE_CDN_BASE_URL */
const CDN_BASE = import.meta.env.VITE_CDN_BASE_URL as string | undefined;

/** Whether backend Lambda pipeline is active (generates thumb/medium automatically) */
export const IS_LAMBDA_PIPELINE_ACTIVE = !!CDN_BASE;

/** Build a public CDN URL for an S3 object path */
export function cdnUrl(objectPath: string): string | null {
  if (!CDN_BASE) return null;
  const base = CDN_BASE.replace(/\/+$/, "");
  const path = objectPath.replace(/^\/+/, "");
  return `${base}/${path}`;
}

/** Derive thumb path from original */
export function toThumbPath(originalPath: string): string {
  const lastSlash = originalPath.lastIndexOf("/");
  if (lastSlash === -1) return originalPath;
  const dir = originalPath.substring(0, lastSlash);
  const filename = originalPath.substring(lastSlash + 1).replace(/\.[^.]+$/, ".jpg");
  return `${dir}/thumb/${filename}`;
}

/** Derive medium path from original */
export function toMediumPath(originalPath: string): string {
  const lastSlash = originalPath.lastIndexOf("/");
  if (lastSlash === -1) return originalPath;
  const dir = originalPath.substring(0, lastSlash);
  const filename = originalPath.substring(lastSlash + 1).replace(/\.[^.]+$/, ".jpg");
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
