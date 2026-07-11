/**
 * viufoto-face-indexer — production
 * Pipeline: S3 PUT -> SNS (viufoto-photo-uploaded) -> SQS (viufoto-face-queue) -> this Lambda
 *
 * Mesmo padrão da Lambda BIB:
 *  - Rekognition fixed em us-east-1.
 *  - Download do original em S3 (sa-east-1) + prepareForRekognition() via sharp
 *    (converte WebP/HEIC, resize <= 2000px, comprime JPEG q88..58 até <=4MB).
 *  - Chama IndexFaces com CollectionId = event_<uuid-sem-hifen> (RPC ensure_face_collection).
 *  - Grava em event_photo_faces, atualiza event_photos.faces_indexed_at, bumpa
 *    event_indexing_progress (faces_done/faces_errors) e event_face_collections.
 *  - Se a linha em event_photos ainda não existir -> throw PhotoRowNotReadyException
 *    (SQS re-entrega via visibilityTimeout até DLQ).
 *  - Erros permanentes (InvalidImageFormat/ImageTooLarge/etc) NÃO relançam:
 *    gravam em bib_detection_errors com pipeline='face' e marcam faces_indexed_at
 *    para não reprocessar em loop.
 */
const {
  RekognitionClient,
  IndexFacesCommand,
  CreateCollectionCommand,
} = require("@aws-sdk/client-rekognition");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

const REK_REGION = process.env.REK_REGION || "us-east-1";
const S3_REGION = process.env.S3_REGION || "sa-east-1";
const BUCKET = process.env.S3_BUCKET;
const MIN_FACE_CONFIDENCE = Number(process.env.MIN_FACE_CONFIDENCE || 80);
const REK_MAX_BYTES = 5 * 1024 * 1024;
const TARGET_MAX_BYTES = 4 * 1024 * 1024;
const TARGET_MAX_SIDE = 2000;

const PERMANENT_ERRORS = new Set([
  "InvalidImageFormatException",
  "InvalidS3ObjectException",
  "ImageTooLargeException",
  "InvalidParameterException",
  "ResourceNotFoundException",
]);

const rek = new RekognitionClient({ region: REK_REGION });
const s3 = new S3Client({ region: S3_REGION });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

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

async function prepareForRekognition(originalBytes, s3Key) {
  const ext = (s3Key.split(".").pop() || "").toLowerCase();
  const needsFormatConvert = ["webp", "heic", "heif", "tif", "tiff", "avif"].includes(ext);
  const needsResize = originalBytes.length > TARGET_MAX_BYTES;
  if (!needsFormatConvert && !needsResize) return { bytes: originalBytes, transformed: false };

  const meta = await sharp(originalBytes, { failOn: "none" }).metadata();
  const maxSide = Math.max(meta.width || 0, meta.height || 0);
  const resizeTo = maxSide > TARGET_MAX_SIDE ? TARGET_MAX_SIDE : undefined;

  for (const q of [88, 78, 68, 58]) {
    let pipe = sharp(originalBytes, { failOn: "none" }).rotate();
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
      console.log(`[face] sharp prepared bytes=${out.length} quality=${q} resize=${resizeTo || "no"} src=${originalBytes.length} ext=${ext}`);
      return { bytes: out, transformed: true, quality: q };
    }
  }

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
  console.log(`[face] sharp FORCED prepared bytes=${forced.length} src=${originalBytes.length} ext=${ext}`);
  return { bytes: forced, transformed: true, quality: 60 };
}

async function fetchEventContext(eventId) {
  const { data } = await sb
    .from("events")
    .select("id, face_search_enabled, face_index_mode")
    .eq("id", eventId)
    .single();
  return data;
}

async function findPhotoId(eventId, originalKey) {
  const { data } = await sb
    .from("event_photos")
    .select("id, faces_indexed_at")
    .eq("event_id", eventId)
    .eq("file_url", originalKey)
    .maybeSingle();
  return data || null;
}

async function ensureCollection(eventId) {
  const { data, error } = await sb.rpc("ensure_face_collection", { _event_id: eventId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  const collectionId = row?.collection_id;
  const createdNow = !!row?.created;
  if (!collectionId) throw new Error(`ensure_face_collection returned no collection_id for ${eventId}`);
  if (createdNow) {
    try {
      await rek.send(new CreateCollectionCommand({ CollectionId: collectionId }));
      console.log(`[face] collection_created id=${collectionId}`);
    } catch (e) {
      if (e?.name !== "ResourceAlreadyExistsException") throw e;
    }
  }
  return collectionId;
}

async function bumpProgress(eventId, field) {
  const { data } = await sb
    .from("event_indexing_progress")
    .select("faces_done, faces_errors")
    .eq("event_id", eventId)
    .maybeSingle();
  const patch = { last_updated_at: new Date().toISOString() };
  if (field === "done") patch.faces_done = (data?.faces_done || 0) + 1;
  if (field === "error") patch.faces_errors = (data?.faces_errors || 0) + 1;
  await sb.from("event_indexing_progress").upsert({ event_id: eventId, ...patch });
}

async function bumpCollectionCounter(eventId, addFaces) {
  const { data } = await sb
    .from("event_face_collections")
    .select("faces_indexed")
    .eq("event_id", eventId)
    .maybeSingle();
  await sb
    .from("event_face_collections")
    .update({
      faces_indexed: (data?.faces_indexed || 0) + addFaces,
      last_indexed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId);
}

async function processKey(originalKey) {
  const eventId = parseEventId(originalKey);
  if (!eventId) {
    console.log("[face] skip (no eventId in path):", originalKey);
    return;
  }
  console.log(`[face] eventId=${eventId} originalKey=${originalKey}`);

  const event = await fetchEventContext(eventId);
  if (!event) {
    console.log(`[face] skip (event not found): ${eventId}`);
    return;
  }
  if (event.face_search_enabled === false) {
    console.log(`[face] skip eventId=${eventId} (face_search_enabled=false)`);
    return;
  }
  if (event.face_index_mode === "on_demand") {
    console.log(`[face] skip eventId=${eventId} (face_index_mode=on_demand)`);
    return;
  }

  const photo = await findPhotoId(eventId, originalKey);
  if (!photo) {
    const msg = `event_photos row not found yet for key=${originalKey} (eventId=${eventId})`;
    console.warn(`[face] photoId=NOT_FOUND -> throwing for SQS retry. ${msg}`);
    const e = new Error(msg);
    e.name = "PhotoRowNotReadyException";
    throw e;
  }
  const photoId = photo.id;
  if (photo.faces_indexed_at) {
    console.log(`[face] skip photoId=${photoId} (already indexed at ${photo.faces_indexed_at})`);
    return;
  }

  const collectionId = await ensureCollection(eventId);
  console.log(`[face] photoId=${photoId} collectionId=${collectionId}`);

  let rawBytes;
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: originalKey }));
    rawBytes = await streamToBytes(obj.Body);
  } catch (err) {
    console.error(`[face] S3 GET failed photoId=${photoId} key=${originalKey} -> ${err.name}: ${err.message}`);
    throw err; // transient -> SQS retry
  }

  let prepared;
  try {
    prepared = await prepareForRekognition(rawBytes, originalKey);
  } catch (err) {
    console.error(`[face] sharp prep failed photoId=${photoId}: ${err.name}: ${err.message}`);
    await sb.from("bib_detection_errors").insert({
      photo_id: photoId,
      event_id: eventId,
      s3_key: originalKey,
      error_code: err.name || "SharpError",
      error_message: err.message,
      pipeline: "face",
    });
    await sb.from("event_photos").update({ faces_indexed_at: new Date().toISOString() }).eq("id", photoId);
    await bumpProgress(eventId, "error");
    return; // permanent — don't retry
  }

  let out;
  try {
    out = await rek.send(new IndexFacesCommand({
      CollectionId: collectionId,
      Image: { Bytes: prepared.bytes },
      ExternalImageId: photoId,
      MaxFaces: 15,
      QualityFilter: "AUTO",
      DetectionAttributes: ["DEFAULT"],
    }));
  } catch (err) {
    const permanent = PERMANENT_ERRORS.has(err.name);
    console.error(`[face] IndexFaces error photoId=${photoId} -> ${err.name}: ${err.message} permanent=${permanent}`);
    await sb.from("bib_detection_errors").insert({
      photo_id: photoId,
      event_id: eventId,
      s3_key: originalKey,
      error_code: err.name,
      error_message: err.message,
      pipeline: "face",
    });
    await bumpProgress(eventId, "error");
    if (permanent) {
      await sb.from("event_photos").update({ faces_indexed_at: new Date().toISOString() }).eq("id", photoId);
      return; // stop the retry loop
    }
    throw err; // transient -> SQS retry
  }

  const faceRecords = (out.FaceRecords || []).filter(
    (fr) => (fr.Face?.Confidence || 0) >= MIN_FACE_CONFIDENCE,
  );

  if (faceRecords.length > 0) {
    const rows = faceRecords.map((fr) => ({
      event_id: eventId,
      photo_id: photoId,
      rekognition_face_id: fr.Face.FaceId,
      external_image_id: photoId,
      bounding_box: fr.Face.BoundingBox || {},
      confidence: fr.Face.Confidence ?? 0,
      quality: fr.FaceDetail?.Quality || null,
      pose: fr.FaceDetail?.Pose || null,
    }));
    const { error: insErr } = await sb.from("event_photo_faces").insert(rows);
    if (insErr) {
      console.error(`[face] insert event_photo_faces FAILED photoId=${photoId}: ${insErr.message}`);
      throw insErr;
    }
    console.log(`[face] event_photo_faces INSERT ok photoId=${photoId} rows=${rows.length}`);
  } else {
    console.log(`[face] no qualifying faces (>=${MIN_FACE_CONFIDENCE}%) photoId=${photoId}`);
  }

  const { error: updErr } = await sb
    .from("event_photos")
    .update({ faces_indexed_at: new Date().toISOString() })
    .eq("id", photoId);
  if (updErr) {
    console.error(`[face] event_photos UPDATE FAILED photoId=${photoId}: ${updErr.message}`);
    throw updErr;
  }

  await bumpProgress(eventId, "done");
  if (faceRecords.length > 0) await bumpCollectionCounter(eventId, faceRecords.length);

  console.log(`[face] indexed faces=${faceRecords.length} photoId=${photoId} eventId=${eventId}`);
}

exports.handler = async (event) => {
  for (const record of event.Records || []) {
    let body;
    try {
      body = typeof record.body === "string" ? JSON.parse(record.body) : record.body;
    } catch {
      continue;
    }
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
      if (!key || key.includes("/thumb/") || key.includes("/medium/")) continue;
      try {
        await processKey(key);
      } catch (err) {
        console.error("[face] Error processing", key, err);
        throw err; // let SQS retry
      }
    }
  }
  return { ok: true };
};