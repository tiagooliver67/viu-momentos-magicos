/**
 * Duplicate file detection utilities used before an S3 upload.
 *
 * Fast path: compare by `file_name` against existing rows of the event.
 * Smart path: enrich with `file_size` when available so we can tell
 *   "arquivo realmente igual" (same name + same size) from
 *   "mesmo nome, conteúdo diferente" (same name, different size).
 *
 * SHA-256 is computed on demand (client-side) for the "Atualizar evento"
 * mode when we want to be extra confident about equality.
 */

export interface ExistingFileRef {
  id: string;
  file_name: string | null;
  /** Optional; only populated for rows that have it in the DB. */
  file_size?: number | null;
  /** Optional SHA-256 hex; not present today but forward-compatible. */
  file_hash?: string | null;
}

export interface DuplicateEntry {
  file: File;
  existing: ExistingFileRef;
  /** true when name + size match — treated as "identical". */
  identical: boolean;
  /** true when name matches but size differs — "same name, different content". */
  differentContent: boolean;
}

export interface DetectionResult {
  /** Files with no name collision — safe to upload as-is. */
  fresh: File[];
  /** Files whose name already exists in the event. */
  duplicates: DuplicateEntry[];
}

export function detectDuplicates(
  incoming: File[],
  existing: ExistingFileRef[],
): DetectionResult {
  const byName = new Map<string, ExistingFileRef>();
  for (const e of existing) {
    if (e.file_name) byName.set(e.file_name.toLowerCase(), e);
  }
  const fresh: File[] = [];
  const duplicates: DuplicateEntry[] = [];
  for (const f of incoming) {
    const match = byName.get(f.name.toLowerCase());
    if (!match) {
      fresh.push(f);
      continue;
    }
    const existingSize = typeof match.file_size === "number" ? match.file_size : null;
    const identical = existingSize != null && existingSize === f.size;
    const differentContent = existingSize != null && existingSize !== f.size;
    duplicates.push({ file: f, existing: match, identical, differentContent });
  }
  return { fresh, duplicates };
}

/**
 * Produce a non-colliding filename by appending " (2)", " (3)", ...
 * The suffix goes before the extension so the file type is preserved.
 */
export function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let i = 2; i < 10_000; i++) {
    const candidate = `${base} (${i})${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  // Extremely unlikely fallback: timestamp.
  return `${base}_${Date.now()}${ext}`;
}

/**
 * Clone a File with a new name — File is immutable but the constructor
 * accepts a Blob source, so we wrap the original bytes and preserve the type.
 */
export function renameFile(file: File, newName: string): File {
  return new File([file], newName, { type: file.type, lastModified: file.lastModified });
}

/** Compute SHA-256 of a File and return a hex string. */
export async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

/** Human-readable file size (pt-BR). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}