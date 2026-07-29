/**
 * Domínio canônico oficial da ViuFoto.
 * Todos os links de compartilhamento (evento, foto, inscrição, indicação)
 * devem usar este domínio, independentemente de onde forem copiados
 * (preview do Lovable, localhost, etc.).
 */
export const CANONICAL_SITE_URL = "https://viufoto.com";

/** Base usada para montar links públicos compartilháveis. */
export function shareBaseUrl(): string {
  return CANONICAL_SITE_URL;
}

/** Monta uma URL pública canônica a partir de um caminho (`/evento/123`). */
export function shareUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_SITE_URL}${normalized}`;
}