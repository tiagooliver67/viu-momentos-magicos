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
  /**
   * Optional map of SHA-256 hex hashes for the incoming files. When provided,
   * hash equality (content) takes precedence over name equality — so a photo
   * renamed on the photographer's PC still gets caught as a duplicate.
   */
  incomingHashes?: Map<File, string>,
): DetectionResult {
  const byName = new Map<string, ExistingFileRef>();
  const byHash = new Map<string, ExistingFileRef>();
  for (const e of existing) {
    if (e.file_name) byName.set(e.file_name.toLowerCase(), e);
    if (e.file_hash) byHash.set(e.file_hash, e);
  }
  const fresh: File[] = [];
  const duplicates: DuplicateEntry[] = [];
  for (const f of incoming) {
    // 1) Hash match — real content duplicate, even if renamed locally.
    const hash = incomingHashes?.get(f);
    let match: ExistingFileRef | undefined = hash ? byHash.get(hash) : undefined;
    let matchedByHash = !!match;
    // 2) Fallback: name match (with size as secondary signal).
    if (!match) match = byName.get(f.name.toLowerCase());
    if (!match) {
      fresh.push(f);
      continue;
    }
    const existingSize = typeof match.file_size === "number" ? match.file_size : null;
    // Hash match implies identical content by definition.
    const identical = matchedByHash
      ? true
      : (existingSize != null && existingSize === f.size);
    const differentContent = matchedByHash
      ? false
      : (existingSize != null && existingSize !== f.size);
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

/**
 * Streaming SHA-256 of a File. Reads the file in 8 MB chunks so vídeos de
 * vários GB não estouram memória. Como o WebCrypto não expõe digest incremental,
 * concatenamos os chunks num único ArrayBuffer só no final — mas em fluxo,
 * evitando o pico de memória de `file.arrayBuffer()` em arquivos gigantes.
 *
 * Nota: `crypto.subtle.digest` roda em uma única thread nativa, aceleração de
 * hardware quando disponível. Para arquivos > ~2GB usamos um agregador manual.
 */
export async function sha256HexStreaming(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const CHUNK = 8 * 1024 * 1024; // 8 MB
  // Fast path for small files.
  if (file.size <= CHUNK) {
    const hex = await sha256Hex(file);
    onProgress?.(1);
    return hex;
  }
  // Read in chunks, concatenar em Uint8Array e digestar de uma vez.
  // Isso mantém RAM ≈ tamanho do arquivo (não 2×) durante o hash, e evita
  // que o browser carregue tudo antes do primeiro yield.
  const total = file.size;
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (let start = 0; start < total; start += CHUNK) {
    const end = Math.min(start + CHUNK, total);
    const chunkBuf = await file.slice(start, end).arrayBuffer();
    buffer.set(new Uint8Array(chunkBuf), offset);
    offset += chunkBuf.byteLength;
    onProgress?.(offset / total);
    // Yield to the event loop between chunks so a UI pode atualizar.
    await new Promise((r) => setTimeout(r, 0));
  }
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

/**
 * Computa SHA-256 para uma lista de arquivos, em série, informando progresso
 * global (0..1). Em série (não paralelo) para não competir por CPU/memória
 * em máquinas modestas com múltiplos arquivos grandes.
 *
 * Retorna um Map<File, hash>. Arquivos que falharem no hash são simplesmente
 * omitidos do Map — o caller trata como "sem hash" e cai no fallback de nome.
 */
export async function enrichWithHashes(
  files: File[],
  onProgress?: (info: { doneFiles: number; totalFiles: number; currentFileFraction: number; currentFileName: string }) => void,
): Promise<Map<File, string>> {
  const out = new Map<File, string>();
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    try {
      const hex = await sha256HexStreaming(f, (frac) => {
        onProgress?.({ doneFiles: i, totalFiles: files.length, currentFileFraction: frac, currentFileName: f.name });
      });
      out.set(f, hex);
    } catch (err) {
      console.warn("[duplicateDetection] Falha ao calcular hash de", f.name, err);
    }
  }
  onProgress?.({ doneFiles: files.length, totalFiles: files.length, currentFileFraction: 1, currentFileName: "" });
  return out;
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