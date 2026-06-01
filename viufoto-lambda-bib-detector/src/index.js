/**
 * viufoto-bib-detector
 * Consumes SQS messages (S3 events) and runs Rekognition DetectText
 * on the /medium/ webp variant of each uploaded photo.
 */
const { RekognitionClient, DetectTextCommand } = require("@aws-sdk/client-rekognition");
const { createClient } = require("@supabase/supabase-js");

const REGION = process.env.AWS_REGION || "sa-east-1";
const BUCKET = process.env.S3_BUCKET;
const MIN_CONF = Number(process.env.MIN_CONFIDENCE || 80);
const DEFAULT_REGEX = process.env.DEFAULT_REGEX || "^\\d{1,6}$";

const rek = new RekognitionClient({ region: REGION });
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

  let resp;
  try {
    resp = await rek.send(
      new DetectTextCommand({ Image: { S3Object: { Bucket: BUCKET, Name: mediumKey } } })
    );
  } catch (err) {
    await sb.from("bib_detection_errors").insert({
      photo_id: photoId,
      event_id: eventId,
      s3_key: mediumKey,
      error_code: err.name,
      error_message: err.message,
    });
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
    .update({ bibs_indexed_at: new Date().toISOString(), bibs_count: rows.length })
    .eq("id", photoId);

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
    const s3Records = body.Records || [];
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