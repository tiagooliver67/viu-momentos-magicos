import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { RekognitionClient, DetectTextCommand } from "npm:@aws-sdk/client-rekognition@3";
import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3@3";
// WebP → JPEG conversion via jsquash (WASM). imagescript does NOT support WebP decoding.
// NOTE: '%40' = URL-encoded '@'. We avoid the literal `name@version` pattern because
// the deploy bundler runs source through a pipeline that applies Cloudflare email
// obfuscation and mangles `[email protected]` → `[email protected]`, breaking the import.
import decodeWebp from "https://esm.sh/@jsquash/webp%401.5.0/decode";
import encodeJpeg from "https://esm.sh/@jsquash/jpeg%401.6.0/encode";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Rekognition em us-east-1 (DetectText indisponível em sa-east-1 para esta conta)
const REK_REGION = "us-east-1";
// S3 bucket permanece em sa-east-1
const S3_REGION = Deno.env.get("AWS_S3_REGION") || "sa-east-1";
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_REKOGNITION_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_REKOGNITION_SECRET_ACCESS_KEY")!;
const S3_BUCKET = "viufoto-images-bucket";

const rek = new RekognitionClient({
  region: REK_REGION,
  credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
});

const s3 = new S3Client({
  region: S3_REGION,
  credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
});

function extractKey(fileUrl: string): string {
  // Stored as raw object keys like "usuarios/.../fotos/xxx.jpg"
  if (fileUrl.startsWith("usuarios/") || fileUrl.startsWith("eventos/")) return fileUrl;
  try {
    const u = new URL(fileUrl);
    return decodeURIComponent(u.pathname.replace(/^\/+/, "").replace(new RegExp(`^${S3_BUCKET}/`), ""));
  } catch {
    return fileUrl;
  }
}

/** Derive the /medium/<name>.webp variant from an original key. */
function toMediumKey(originalKey: string): string {
  const slash = originalKey.lastIndexOf("/");
  if (slash === -1) return originalKey;
  const dir = originalKey.substring(0, slash);
  const name = originalKey.substring(slash + 1).replace(/\.[^.]+$/, ".webp");
  return `${dir}/medium/${name}`;
}

async function streamToBytes(body: any): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  if (typeof body?.transformToByteArray === "function") {
    return await body.transformToByteArray();
  }
  // Fallback: ReadableStream
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

/** Detect image format from magic bytes. */
function detectFormat(bytes: Uint8Array): "jpeg" | "png" | "webp" | "unknown" {
  if (bytes.length < 12) return "unknown";
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  // WEBP: "RIFF"...."WEBP"
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  return "unknown";
}

/** Convert WebP bytes to JPEG bytes (Rekognition only accepts JPEG/PNG). */
async function webpToJpeg(webpBytes: Uint8Array): Promise<Uint8Array> {
  // jsquash decode returns ImageData { data: Uint8ClampedArray (RGBA), width, height }
  const imageData = await decodeWebp(webpBytes);
  const jpegAb = await encodeJpeg(imageData, { quality: 85 });
  return new Uint8Array(jpegAb);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    // Lote pequeno: jsquash (WASM WebP decode) é CPU-intensivo e o Edge Function
    // tem orçamento de CPU restrito. Acima de ~3 fotos por invocação o runtime
    // mata o processo com "CPU Time exceeded". Cliente deve clicar novamente
    // para processar o próximo lote.
    const { event_id, force = false, limit = 3 } = body as { event_id?: string; force?: boolean; limit?: number };
    if (!event_id) return new Response(JSON.stringify({ error: "event_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Authorize: super_admin OR organizer of event
    const [{ data: roleRow }, { data: ev }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle(),
      admin.from("events").select("id, organizer_id, bib_number_pattern, bib_search_enabled").eq("id", event_id).maybeSingle(),
    ]);
    if (!ev) return new Response(JSON.stringify({ error: "Event not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!roleRow && ev.organizer_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pattern = new RegExp(ev.bib_number_pattern || "^\\d{1,6}$");

    // Cap defensivo: nunca aceitar mais que 3 por invocação, mesmo se cliente
    // pedir mais, pois o limite real é CPU e não wall-clock.
    const effectiveLimit = Math.min(Math.max(limit, 1), 3);
    let q = admin.from("event_photos").select("id, file_url, bibs_indexed_at").eq("event_id", event_id).order("created_at", { ascending: false }).limit(effectiveLimit);
    if (!force) q = q.is("bibs_indexed_at", null);
    const { data: photos, error: photosErr } = await q;
    if (photosErr) throw photosErr;

    let processed = 0;
    let totalDetections = 0;
    let skippedTooBig = 0;
    let skippedNoFile = 0;
    const details: Array<{
      photo_id: string;
      usedKey: string;
      used_medium: boolean;
      fmt: string;
      size_before: number | null;
      size_after: number | null;
      outcome: "processed" | "skipped_too_big" | "skipped_no_file" | "error";
      detections?: number;
      error?: string;
    }> = [];
    const errors: Array<{ photo_id: string; message: string }> = [];

    for (const p of photos || []) {
      const key = extractKey(p.file_url);
      const mediumKey = toMediumKey(key);
      let usedKey = mediumKey;
      let usedMedium = true;
      let imageBytes: Uint8Array | null = null;
      let fmtCaptured = "unknown";
      let sizeBeforeCaptured: number | null = null;
      try {
        // 1) Try /medium/<name>.webp first (≤5MB target)
        try {
          const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: mediumKey }));
          imageBytes = await streamToBytes(obj.Body);
        } catch (mediumErr) {
          // Fallback to original if medium variant doesn't exist yet
          usedKey = key;
          usedMedium = false;
          const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
          imageBytes = await streamToBytes(obj.Body);
        }

        if (!imageBytes || imageBytes.byteLength === 0) {
          skippedNoFile++;
          details.push({ photo_id: p.id, usedKey, used_medium: usedMedium, fmt: "n/a", size_before: 0, size_after: 0, outcome: "skipped_no_file" });
          console.warn(`[bib-reindex] photo=${p.id} usedKey=${usedKey} SKIPPED no_file (empty bytes)`);
          continue;
        }

        // Rekognition only accepts JPEG / PNG. Convert WebP → JPEG.
        const fmt = detectFormat(imageBytes);
        const sizeBefore = imageBytes.byteLength;
        fmtCaptured = fmt;
        sizeBeforeCaptured = sizeBefore;
        if (fmt === "webp") {
          imageBytes = await webpToJpeg(imageBytes);
        } else if (fmt === "unknown") {
          throw new Error(`Unsupported image format for ${usedKey} (magic bytes not JPEG/PNG/WebP)`);
        }
        console.log(`[bib-reindex] photo=${p.id} usedKey=${usedKey} used_medium=${usedMedium} fmt=${fmt} size_before=${sizeBefore} size_after=${imageBytes.byteLength}`);

        if (imageBytes.byteLength > 5 * 1024 * 1024) {
          skippedTooBig++;
          details.push({ photo_id: p.id, usedKey, used_medium: usedMedium, fmt, size_before: sizeBefore, size_after: imageBytes.byteLength, outcome: "skipped_too_big" });
          console.warn(`[bib-reindex] photo=${p.id} usedKey=${usedKey} SKIPPED too_big size=${imageBytes.byteLength}`);
          continue;
        }

        const out = await rek.send(new DetectTextCommand({
          Image: { Bytes: imageBytes },
          Filters: { WordFilter: { MinConfidence: 70 } },
        }));
        const words = (out.TextDetections || []).filter(t => t.Type === "WORD");
        const matches = new Map<string, { confidence: number; bbox: unknown; raw: string }>();
        for (const w of words) {
          const raw = (w.DetectedText || "").trim();
          const cleaned = raw.replace(/[^0-9]/g, "");
          if (cleaned && pattern.test(cleaned)) {
            const prev = matches.get(cleaned);
            const conf = w.Confidence || 0;
            if (!prev || prev.confidence < conf) {
              matches.set(cleaned, { confidence: conf, bbox: w.Geometry?.BoundingBox || {}, raw });
            }
          }
        }

        // Replace existing detections for this photo
        await admin.from("photo_bib_numbers").delete().eq("photo_id", p.id);
        if (matches.size > 0) {
          const rows = Array.from(matches.entries()).map(([number, m]) => ({
            photo_id: p.id,
            event_id,
            number,
            raw_text: m.raw,
            confidence: m.confidence,
            bbox: m.bbox as object,
          }));
          const { error: insErr } = await admin.from("photo_bib_numbers").insert(rows);
          if (insErr) throw insErr;
          totalDetections += rows.length;
        }
        await admin.from("event_photos").update({ bibs_indexed_at: new Date().toISOString(), bibs_count: matches.size }).eq("id", p.id);
        processed++;
        details.push({ photo_id: p.id, usedKey, used_medium: usedMedium, fmt: fmtCaptured, size_before: sizeBeforeCaptured, size_after: imageBytes.byteLength, outcome: "processed", detections: matches.size });
        console.log(`[bib-reindex] photo=${p.id} OK detections=${matches.size}`);
      } catch (e) {
        const anyE = e as any;
        const name = anyE?.name || "UnknownError";
        const message = anyE?.message || String(e);
        const httpStatus = anyE?.$metadata?.httpStatusCode ?? null;
        const fault = anyE?.$fault ?? null;
        const awsCode = anyE?.Code ?? null;
        const stack = anyE?.stack || null;
        const requestId = anyE?.$metadata?.requestId ?? null;
        const extendedRequestId = anyE?.$metadata?.extendedRequestId ?? null;
        const cfId = anyE?.$cfId ?? anyE?.$metadata?.cfId ?? null;
        const attempts = anyE?.$metadata?.attempts ?? null;
        const totalRetryDelay = anyE?.$metadata?.totalRetryDelay ?? null;
        const response = anyE?.$response ? {
          statusCode: anyE.$response.statusCode ?? null,
          headers: anyE.$response.headers ?? null,
          body: (() => { try { return typeof anyE.$response.body === "string" ? anyE.$response.body.slice(0, 2000) : null; } catch { return null; } })(),
        } : null;
        // Enumerate ALL own properties of the error (some SDK errors stash data on non-standard keys)
        const allKeys: Record<string, unknown> = {};
        try {
          for (const k of Object.getOwnPropertyNames(anyE)) {
            if (["stack", "message", "name", "$metadata", "$response", "$fault"].includes(k)) continue;
            const v = (anyE as any)[k];
            if (typeof v === "function") continue;
            try { allKeys[k] = JSON.parse(JSON.stringify(v)); } catch { allKeys[k] = String(v); }
          }
        } catch {}
        const diag = {
          bucket: S3_BUCKET,
          key,
          usedKey,
          imageBytesSize: imageBytes?.byteLength ?? null,
          rekRegion: REK_REGION,
          s3Region: S3_REGION,
          name,
          message,
          httpStatus,
          fault,
          awsCode,
          requestId,
          extendedRequestId,
          cfId,
          attempts,
          totalRetryDelay,
          response,
          allKeys,
          stack,
        };
        console.error(`[bib-reindex] photo=${p.id} usedKey=${usedKey} ERROR ${name}: ${message}`);
        console.error(`[bib-reindex] diag ${JSON.stringify(diag)}`);
        errors.push({ photo_id: p.id, message: `${name}: ${message}` });
        details.push({ photo_id: p.id, usedKey, used_medium: usedMedium, fmt: fmtCaptured, size_before: sizeBeforeCaptured, size_after: imageBytes?.byteLength ?? null, outcome: "error", error: `${name}: ${message}` });
        await admin.from("bib_detection_errors").insert({
          photo_id: p.id,
          event_id,
          s3_key: key,
          error_code: name,
          error_message: JSON.stringify({ message, httpStatus, fault, awsCode, requestId, extendedRequestId, cfId, response, allKeys, usedKey, imageBytesSize: imageBytes?.byteLength ?? null, rekRegion: REK_REGION, s3Region: S3_REGION, bucket: S3_BUCKET, stack }),
        });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      event_id,
      processed,
      total_detections: totalDetections,
      skipped_too_big: skippedTooBig,
      skipped_no_file: skippedNoFile,
      errors_count: errors.length,
      errors: errors.slice(0, 10),
      details,
      regions: { rekognition: REK_REGION, s3: S3_REGION, bucket: S3_BUCKET },
      remaining_hint: (photos?.length || 0) === effectiveLimit ? "Há mais fotos pendentes — clique novamente em 'Indexar nº peito' para processar o próximo lote." : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});