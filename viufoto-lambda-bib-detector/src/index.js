/**
 * viufoto-bib-detector — production
 * Pipeline: S3 PUT -> SNS (viufoto-photo-uploaded) -> SQS (viufoto-bib-queue) -> this Lambda
 *
 * - Rekognition fixed in us-east-1 (DetectText not enabled in sa-east-1 for this account).
 * - Tries Image.S3Object first (zero data transfer). If cross-region or any S3Object error,
 *   falls back to Image.Bytes (download from S3 -> send raw bytes to Rekognition).
 * - Updates event_photos.indexing_status and event_indexing_progress for the realtime UI.
 *
 * Phase 1 (estabilidade):
 *  - Usa o ARQUIVO ORIGINAL (JPG/JPEG) no Rekognition (DetectText não suporta WebP).
 *  - Se a linha em event_photos ainda não existir, LANÇA erro para a mensagem retornar
 *    ao fluxo de retry da SQS (e eventualmente ir para a DLQ após visibilityTimeout/maxReceiveCount).
 *  - Logs explícitos em cada etapa para auditoria.
 */
const { RekognitionClient, DetectTextCommand } = require("@aws-sdk/client-rekognition");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

const REK_REGION = process.env.REK_REGION || "us-east-1";
const S3_REGION = process.env.S3_REGION || "sa-east-1";
const BUCKET = process.env.S3_BUCKET;
const MIN_CONF = Number(process.env.MIN_CONFIDENCE || 80);
const DEFAULT_REGEX = process.env.DEFAULT_REGEX || "^\\d{1,6}$";
const REK_MAX_BYTES = 5 * 1024 * 1024;   // Rekognition Image.Bytes hard limit
const TARGET_MAX_BYTES = 4 * 1024 * 1024; // safety margin
const TARGET_MAX_SIDE = 2000;             // px — plenty for bib OCR

const rek = new RekognitionClient({ region: REK_REGION });
const s3 = new S3Client({ region: S3_REGION });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Extract eventId from path: usuarios/{uid}/eventos/{eventId}/fotos/... */
function parseEventId(key) {
  const m = key.match(/^usuarios\/[^/]+\/eventos\/([^/]+)\/fotos\//);
  return m ? m[1] : null;
}

async function streamToBytes(body) {
  if (body?.transformToByteArray) return await body.transformToByteArray();
  const chunks = [];
  for await (const c of body) chunks.push(c);
  return Buffer.concat(chunks);
}

/**
 * Prepare bytes for Rekognition:
 *  - Convert unsupported formats (WebP/HEIC/HEIF/TIFF/AVIF) to JPEG.
 *  - Downscale to max side <= TARGET_MAX_SIDE.
 *  - Compress until it fits under TARGET_MAX_BYTES (q 88 -> 78 -> 68 -> 58).
 *  - If already JPEG/PNG and under the limit, returns the original bytes untouched.
 */
async function prepareForRekognition(originalBytes, s3Key) {
  const ext = (s3Key.split(".").pop() || "").toLowerCase();
  const needsFormatConvert = ["webp", "heic", "heif", "tif", "tiff", "avif"].includes(ext);
  const needsResize = originalBytes.length > TARGET_MAX_BYTES;

  if (!needsFormatConvert && !needsResize) {
    return { bytes: originalBytes, transformed: false };
  }

  const meta = await sharp(originalBytes, { failOn: "none" }).metadata();
  const maxSide = Math.max(meta.width || 0, meta.height || 0);
  const resizeTo = maxSide > TARGET_MAX_SIDE ? TARGET_MAX_SIDE : undefined;

  for (const q of [88, 78, 68, 58]) {
    let pipe = sharp(originalBytes, { failOn: "none" }).rotate(); // apply EXIF orientation
    if (resizeTo) {
      pipe = pipe.resize({
        width: (meta.width || 0) >= (meta.height || 0) ? resizeTo : undefined,
        height: (meta.height || 0) > (meta.width || 0) ? resizeTo : undefined,
        withoutEnlargement: true,
        fit: "inside",
      });
    }
    const out = await pipe.jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (out.length <= TARGET_MAX_BYTES) {
      console.log(`[bib] sharp prepared bytes=${out.length} quality=${q} resize=${resizeTo || "no"} src=${originalBytes.length} ext=${ext}`);
      return { bytes: out, transformed: true, quality: q };
    }
  }

  // Last resort: harder downscale (1600px) + q60
  const forced = await sharp(originalBytes, { failOn: "none" })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 60, mozjpeg: true })
    .toBuffer();
  if (forced.length > REK_MAX_BYTES) {
    const e = new Error(`Could not fit image under Rekognition 5MB limit (${forced.length} bytes)`);
    e.name = "ImageTooLargeException";
    throw e;
  }
  console.log(`[bib] sharp FORCED prepared bytes=${forced.length} src=${originalBytes.length} ext=${ext}`);
  return { bytes: forced, transformed: true, quality: 60 };
}

async function detectText(s3Key) {
  // Always download from S3 and prepare bytes. S3Object direct isn't used because:
  //  - Rekognition runs in us-east-1 and the bucket is in sa-east-1 (cross-region blocked).
  //  - Rekognition doesn't accept WebP even via S3Object.
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }));
  const rawBytes = await streamToBytes(obj.Body);
  const { bytes } = await prepareForRekognition(rawBytes, s3Key);
  return await rek.send(new DetectTextCommand({ Image: { Bytes: bytes } }));
}

async function bumpProgress(eventId, field) {
  // Atomic increment via SQL function would be cleaner; for now read-modify-write is fine
  // because the trigger keeps total_photos correct and we only race on counters.
  const { data } = await sb
    .from("event_indexing_progress")
    .select("bibs_done, bibs_errors")
    .eq("event_id", eventId)
    .maybeSingle();
  const patch = { last_updated_at: new Date().toISOString() };
  if (field === "done") patch.bibs_done = (data?.bibs_done || 0) + 1;
  if (field === "error") patch.bibs_errors = (data?.bibs_errors || 0) + 1;
  await sb.from("event_indexing_progress").upsert({ event_id: eventId, ...patch });
}

async function fetchEventContext(eventId) {
  const { data } = await sb
    .from("events")
    .select("id, bib_search_enabled, bib_number_pattern")
    .eq("id", eventId)
    .single();
  return data;
}

async function findPhotoId(eventId, originalKey) {
  const { data } = await sb
    .from("event_photos")
    .select("id")
    .eq("event_id", eventId)
    .eq("file_url", originalKey)
    .maybeSingle();
  return data?.id || null;
}

async function processKey(originalKey) {
  const eventId = parseEventId(originalKey);
  if (!eventId) {
    console.log("Skip (no eventId in path):", originalKey);
    return;
  }
  console.log(`[bib] eventId=${eventId} originalKey=${originalKey}`);

  const event = await fetchEventContext(eventId);
  if (!event) {
    console.log("Skip (event not found):", eventId);
    return;
  }
  if (event.bib_search_enabled === false) {
    console.log(`[bib] Skip eventId=${eventId} (bib_search_enabled=false)`);
    return;
  }

  const photoId = await findPhotoId(eventId, originalKey);
  if (!photoId) {
    // FIX A: NÃO silenciar. Lançar erro para SQS reentregar (retry/DLQ).
    const msg = `event_photos row not found yet for key=${originalKey} (eventId=${eventId})`;
    console.warn(`[bib] photoId=NOT_FOUND -> throwing for SQS retry. ${msg}`);
    const e = new Error(msg);
    e.name = "PhotoRowNotReadyException";
    throw e;
  }
  console.log(`[bib] photoId=${photoId} (found)`);

  // FIX B: Usar o ORIGINAL (JPG/JPEG). Rekognition DetectText não suporta WebP.
  const imageKey = originalKey;
  const regex = new RegExp(event.bib_number_pattern || DEFAULT_REGEX);
  console.log(`[bib] OCR image=${imageKey} regex=${regex}`);

  await sb.from("event_photos").update({ indexing_status: "processing" }).eq("id", photoId);

  let resp;
  try {
    resp = await detectText(imageKey);
  } catch (err) {
    console.error(`[bib] Rekognition error photoId=${photoId} key=${imageKey} -> ${err.name}: ${err.message}`);
    await sb.from("bib_detection_errors").insert({
      photo_id: photoId,
      event_id: eventId,
      s3_key: imageKey,
      error_code: err.name,
      error_message: err.message,
    });
    await sb.from("event_photos").update({ indexing_status: "error" }).eq("id", photoId);
    await bumpProgress(eventId, "error");
    throw err;
  }

  const allDetections = resp.TextDetections || [];
  console.log(`[bib] rawDetections=${allDetections.length} (WORD=${allDetections.filter(d=>d.Type==='WORD').length} LINE=${allDetections.filter(d=>d.Type==='LINE').length})`);
  // Accept BOTH WORD and LINE. LINE often groups multi-digit numbers that WORD splits.
  const detections = allDetections.filter((d) => d.Type === "WORD" || d.Type === "LINE");
  const seen = new Map(); // number -> best detection
  for (const d of detections) {
    const text = (d.DetectedText || "").trim();
    const conf = d.Confidence || 0;
    if (conf < MIN_CONF) continue;
    if (!regex.test(text)) continue;
    const bbox = d.Geometry?.BoundingBox || {};
    // discard tiny bboxes (likely noise)
    if ((bbox.Width || 0) * (bbox.Height || 0) < 0.0001) continue;
    const existing = seen.get(text);
    if (!existing || existing.confidence < conf) {
      seen.set(text, { number: text, raw_text: d.DetectedText, confidence: conf, bbox });
    }
  }

  const rows = Array.from(seen.values()).map((v) => ({
    event_id: eventId,
    photo_id: photoId,
    number: v.number,
    raw_text: v.raw_text,
    confidence: v.confidence,
    bbox: v.bbox,
  }));
  console.log(`[bib] detections=${detections.length} valid=${rows.length} numbers=[${rows.map(r=>r.number).join(",")}]`);

  if (rows.length > 0) {
    const { error } = await sb.from("photo_bib_numbers").insert(rows);
    if (error) {
      console.error(`[bib] insert photo_bib_numbers FAILED photoId=${photoId}: ${error.message}`);
      throw error;
    }
    console.log(`[bib] photo_bib_numbers INSERT ok photoId=${photoId} rows=${rows.length}`);
  } else {
    console.log(`[bib] photo_bib_numbers INSERT skipped photoId=${photoId} (no valid numbers)`);
  }

  const { error: updErr } = await sb
    .from("event_photos")
    .update({
      bibs_indexed_at: new Date().toISOString(),
      bibs_count: rows.length,
      indexing_status: "done",
    })
    .eq("id", photoId);
  if (updErr) {
    console.error(`[bib] event_photos UPDATE FAILED photoId=${photoId}: ${updErr.message}`);
    throw updErr;
  }
  console.log(`[bib] event_photos UPDATE ok photoId=${photoId} status=done bibs_count=${rows.length}`);

  await bumpProgress(eventId, "done");
  console.log(`[bib] event_indexing_progress bumped eventId=${eventId} field=done`);

  console.log(`Indexed ${rows.length} bib(s) for photo ${photoId}`);
}

exports.handler = async (event) => {
  for (const record of event.Records || []) {
    let body;
    try {
      body = typeof record.body === "string" ? JSON.parse(record.body) : record.body;
    } catch {
      continue;
    }
    // SNS -> SQS envelope: body = { Type: "Notification", Message: "<json>" }
    // Direct S3 -> SQS envelope: body = { Records: [...] }
    let s3Records = [];
    if (body.Type === "Notification" && typeof body.Message === "string") {
      try {
        s3Records = (JSON.parse(body.Message).Records) || [];
      } catch {
        s3Records = [];
      }
    } else {
      s3Records = body.Records || [];
    }
    for (const r of s3Records) {
      const key = decodeURIComponent((r.s3?.object?.key || "").replace(/\+/g, " "));
      // Skip derivatives
      if (!key || key.includes("/thumb/") || key.includes("/medium/")) continue;
      try {
        await processKey(key);
      } catch (err) {
        console.error("Error processing", key, err);
        throw err; // let SQS retry
      }
    }
  }
  return { ok: true };
};