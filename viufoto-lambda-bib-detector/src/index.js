/**
 * viufoto-bib-detector — production
 * Pipeline: S3 PUT -> SNS (viufoto-photo-uploaded) -> SQS (viufoto-bib-queue) -> this Lambda
 *
 * - Rekognition fixed in us-east-1 (DetectText not enabled in sa-east-1 for this account).
 * - Tries Image.S3Object first (zero data transfer). If cross-region or any S3Object error,
 *   falls back to Image.Bytes (download from S3 -> send raw bytes to Rekognition).
 * - Updates event_photos.indexing_status and event_indexing_progress for the realtime UI.
 */
const { RekognitionClient, DetectTextCommand } = require("@aws-sdk/client-rekognition");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");

const REK_REGION = process.env.REK_REGION || "us-east-1";
const S3_REGION = process.env.S3_REGION || "sa-east-1";
const BUCKET = process.env.S3_BUCKET;
const MIN_CONF = Number(process.env.MIN_CONFIDENCE || 80);
const DEFAULT_REGEX = process.env.DEFAULT_REGEX || "^\\d{1,6}$";
const MAX_BYTES = 5 * 1024 * 1024; // Rekognition Image.Bytes hard limit

const rek = new RekognitionClient({ region: REK_REGION });
const s3 = new S3Client({ region: S3_REGION });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/** Convert an original S3 key to its /medium/<name>.webp variant. */
function toMediumKey(originalKey) {
  const slash = originalKey.lastIndexOf("/");
  if (slash === -1) return originalKey;
  const dir = originalKey.substring(0, slash);
  const name = originalKey.substring(slash + 1).replace(/\.[^.]+$/, ".webp");
  return `${dir}/medium/${name}`;
}

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

async function detectText(mediumKey) {
  // 1) Try S3Object (works only when Rekognition region == S3 region).
  if (REK_REGION === S3_REGION) {
    try {
      return await rek.send(new DetectTextCommand({
        Image: { S3Object: { Bucket: BUCKET, Name: mediumKey } },
      }));
    } catch (err) {
      console.warn("S3Object failed, falling back to Bytes:", err.name, err.message);
    }
  }
  // 2) Cross-region or fallback: download from S3 and send bytes.
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: mediumKey }));
  const bytes = await streamToBytes(obj.Body);
  if (bytes.length > MAX_BYTES) {
    const e = new Error(`Image exceeds Rekognition 5MB limit (${bytes.length} bytes)`);
    e.name = "ImageTooLargeException";
    throw e;
  }
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

  const event = await fetchEventContext(eventId);
  if (!event) {
    console.log("Skip (event not found):", eventId);
    return;
  }
  if (event.bib_search_enabled === false) {
    console.log("Skip (bib_search_enabled = false):", eventId);
    return;
  }

  const photoId = await findPhotoId(eventId, originalKey);
  if (!photoId) {
    console.log("Skip (photo row not found yet):", originalKey);
    return;
  }

  const mediumKey = toMediumKey(originalKey);
  const regex = new RegExp(event.bib_number_pattern || DEFAULT_REGEX);

  await sb.from("event_photos").update({ indexing_status: "processing" }).eq("id", photoId);

  let resp;
  try {
    resp = await detectText(mediumKey);
  } catch (err) {
    await sb.from("bib_detection_errors").insert({
      photo_id: photoId,
      event_id: eventId,
      s3_key: mediumKey,
      error_code: err.name,
      error_message: err.message,
    });
    await sb.from("event_photos").update({ indexing_status: "error" }).eq("id", photoId);
    await bumpProgress(eventId, "error");
    throw err;
  }

  const detections = (resp.TextDetections || []).filter((d) => d.Type === "WORD");
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

  if (rows.length > 0) {
    const { error } = await sb.from("photo_bib_numbers").insert(rows);
    if (error) throw error;
  }

  await sb
    .from("event_photos")
    .update({
      bibs_indexed_at: new Date().toISOString(),
      bibs_count: rows.length,
      indexing_status: "done",
    })
    .eq("id", photoId);

  await bumpProgress(eventId, "done");

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