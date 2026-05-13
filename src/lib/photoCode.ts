/**
 * Generates a short, user-facing code for a photo (or any UUID-based entity).
 *
 * The code is the first 8 hex chars of the UUID, uppercased — e.g.
 *   "a1b2c3d4-..." → "A1B2C3D4"
 *
 * It is unique enough for human reference (16M combinations per event) and
 * lets the admin search a photo by prefix without exposing the full UUID.
 */
export function getPhotoCode(id?: string | null): string {
  if (!id) return "";
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Normalize a user-typed code for searching (strip spaces / dashes, uppercase). */
export function normalizePhotoCode(input: string): string {
  return input.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}