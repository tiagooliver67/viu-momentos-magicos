/**
 * Helper para servir imagens do Supabase Storage otimizadas
 * (resize + WebP + quality) via Image Transformations.
 *
 * Reescreve URLs do formato:
 *   /storage/v1/object/public/<bucket>/<path>
 * para:
 *   /storage/v1/render/image/public/<bucket>/<path>?width=W&quality=Q&format=webp
 *
 * Usado principalmente para capas de eventos e inscrições, onde o objeto
 * original pode ter vários MB. Para URLs que não são do Supabase Storage
 * (ex.: unsplash, CDN externo), retorna a URL crua sem modificação.
 */
export function getCoverUrl(
  rawUrl: string | null | undefined,
  width = 800,
  quality = 75
): string | null {
  if (!rawUrl) return null;
  const marker = "/storage/v1/object/public/";
  const idx = rawUrl.indexOf(marker);
  if (idx === -1) return rawUrl;

  const base = rawUrl.slice(0, idx) + "/storage/v1/render/image/public/";
  // separar path de eventual querystring existente
  const rest = rawUrl.slice(idx + marker.length);
  const [pathOnly] = rest.split("?");
  const params = new URLSearchParams({
    width: String(width),
    quality: String(quality),
    format: "webp",
    resize: "cover",
  });
  return `${base}${pathOnly}?${params.toString()}`;
}