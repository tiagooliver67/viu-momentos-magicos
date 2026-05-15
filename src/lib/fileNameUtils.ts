/**
 * Normalize a file name for duplicate detection:
 * - strips diacritics (NFD)
 * - lowercases
 * - replaces spaces / special chars with underscore
 * - collapses repeated underscores
 * - preserves the extension
 */
export function normalizeFileName(name: string): string {
  if (!name) return "";
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : "";
  const cleanBase = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
  const cleanExt = ext
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return cleanBase + cleanExt;
}

/** Append a short timestamp identifier before the extension. */
export function withReplaceSuffix(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : "";
  const stamp = Date.now().toString(36);
  return `${base}_${stamp}${ext}`;
}