import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { RekognitionClient, IndexFacesCommand } from "npm:@aws-sdk/client-rekognition@3";
import { S3Client, GetObjectCommand } from "npm:@aws-sdk/client-s3@3";
import decodeWebp from "https://esm.sh/@jsquash/webp%401.5.0/decode";
import encodeJpeg from "https://esm.sh/@jsquash/jpeg%401.6.0/encode";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REK_REGION = Deno.env.get("AWS_REKOGNITION_REGION") || "us-east-1";
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

const PERMANENT_ERRORS = new Set([
  "InvalidImageFormatException",
  "InvalidS3ObjectException",
  "ImageTooLargeException",
  "InvalidParameterException",
  "ResourceNotFoundException",
]);

const log = (level: "info" | "warn" | "error", payload: Record<string, unknown>) => {
  console.log(JSON.stringify({ level, fn: "face-indexer", ts: new Date().toISOString(), ...payload }));
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function extractKey(fileUrl: string): string {
  if (fileUrl.startsWith("usuarios/") || fileUrl.startsWith("eventos/")) return fileUrl;
  try {
    const u = new URL(fileUrl);
    return decodeURIComponent(u.pathname.replace(/^\/+/, "").replace(new RegExp(`^${S3_BUCKET}/`), ""));
  } catch {
    return fileUrl;
  }
}

function toMediumKey(originalKey: string): string {
  const slash = originalKey.lastIndexOf("/");
  if (slash === -1) return originalKey;
  const dir = originalKey.substring(0, slash);
  const name = originalKey.substring(slash + 1).replace(/\.[^.]+$/, ".webp");
  return `${dir}/medium/${name}`;
}

async function streamToBytes(body: any): Promise<Uint8Array> {
  if (body instanceof Uint8Array) return body;
  if (typeof body?.transformToByteArray === "function") return await body.transformToByteArray();
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

function detectFormat(bytes: Uint8Array): "jpeg" | "png" | "webp" | "unknown" {
  if (bytes.length < 12) return "unknown";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  return "unknown";
}

async function webpToJpeg(webpBytes: Uint8Array): Promise<Uint8Array> {
  const imageData = await decodeWebp(webpBytes);
  const jpegAb = await encodeJpeg(imageData, { quality: 85 });
  return new Uint8Array(jpegAb);
}

async function ensureCollection(admin: ReturnType<typeof createClient>, event_id: string): Promise<string> {
  const { data, error } = await admin.rpc("ensure_face_collection", { _event_id: event_id });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  const collection_id = row?.collection_id as string;
  const created_now = !!row?.created;
  if (created_now) {
    try {
      await rek.send(new (await import("npm:@aws-sdk/client-rekognition@3")).CreateCollectionCommand({ CollectionId: collection_id }));
      log("info", { event_id, collection_id, msg: "collection_created" });
    } catch (e) {
      const name = (e as any)?.name || "";
      if (name !== "ResourceAlreadyExistsException") throw e;
    }
  }
  return collection_id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { event_id, force = false, limit = 3 } = body as { event_id?: string; force?: boolean; limit?: number };
    if (!event_id) return jsonResponse({ error: "event_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const [{ data: roleRow }, { data: ev }, { data: photogRow }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle(),
      admin.from("events").select("id, organizer_id, face_search_enabled, face_index_mode").eq("id", event_id).maybeSingle(),
      admin.from("event_photographers").select("photographer_id").eq("event_id", event_id).eq("photographer_id", user.id).maybeSingle(),
    ]);
    if (!ev) return jsonResponse({ error: "Event not found" }, 404);
    const authorized = !!roleRow || ev.organizer_id === user.id || !!photogRow;
    if (!authorized) return jsonResponse({ error: "Forbidden" }, 403);
    if (ev.face_search_enabled === false) return jsonResponse({ error: "Face search disabled for this event" }, 400);

    const effectiveLimit = Math.min(Math.max(limit, 1), 3);

    // Modo de seleção: 'jobs' (consome face_index_jobs) ou 'photos' (varre event_photos.faces_indexed_at IS NULL).
    // O on_demand não enfileira via trigger; nesse caso fazemos backfill direto de event_photos.
    let claimed: Array<{ job_id: string | null; photo_id: string; s3_key: string | null }> = [];
    if (ev.face_index_mode === "on_demand" || force) {
      let q = admin.from("event_photos")
        .select("id, file_url, faces_indexed_at")
        .eq("event_id", event_id)
        .order("created_at", { ascending: false })
        .limit(effectiveLimit);
      if (!force) q = q.is("faces_indexed_at", null);
      const { data: photos, error: photosErr } = await q;
      if (photosErr) throw photosErr;
      claimed = (photos || []).map(p => ({ job_id: null, photo_id: p.id, s3_key: p.file_url }));
    } else {
      const { data: rows, error: claimErr } = await admin.rpc("claim_face_index_jobs", {
        _event_id: event_id,
        _batch_size: effectiveLimit,
      });
      if (claimErr) throw claimErr;
      claimed = (rows || []).map((r: any) => ({ job_id: r.job_id, photo_id: r.photo_id, s3_key: r.s3_key }));
    }

    if (claimed.length === 0) {
      return jsonResponse({ ok: true, processed: 0, msg: "no_pending_jobs" });
    }

    const collection_id = await ensureCollection(admin, event_id);

    let processed = 0;
    let totalFaces = 0;
    const details: Array<Record<string, unknown>> = [];

    for (const item of claimed) {
      const key = extractKey(item.s3_key || "");
      const mediumKey = toMediumKey(key);
      let usedKey = mediumKey;
      let usedMedium = true;
      let imageBytes: Uint8Array | null = null;
      const t0 = Date.now();

      try {
        try {
          const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: mediumKey }));
          imageBytes = await streamToBytes(obj.Body);
        } catch {
          usedKey = key;
          usedMedium = false;
          const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
          imageBytes = await streamToBytes(obj.Body);
        }
        if (!imageBytes || imageBytes.byteLength === 0) {
          throw Object.assign(new Error("Empty image"), { name: "InvalidS3ObjectException" });
        }
        const fmt = detectFormat(imageBytes);
        if (fmt === "webp") imageBytes = await webpToJpeg(imageBytes);
        else if (fmt === "unknown") throw Object.assign(new Error("Unsupported format"), { name: "InvalidImageFormatException" });
        if (imageBytes.byteLength > 5 * 1024 * 1024) {
          throw Object.assign(new Error("Image > 5MB"), { name: "ImageTooLargeException" });
        }

        const out = await rek.send(new IndexFacesCommand({
          CollectionId: collection_id,
          Image: { Bytes: imageBytes },
          ExternalImageId: item.photo_id,
          MaxFaces: 15,
          QualityFilter: "AUTO",
          DetectionAttributes: ["DEFAULT"],
        }));

        const faceRecords = out.FaceRecords || [];
        if (faceRecords.length > 0) {
          const rows = faceRecords.map(fr => ({
            event_id,
            photo_id: item.photo_id,
            rekognition_face_id: fr.Face!.FaceId!,
            external_image_id: item.photo_id,
            bounding_box: fr.Face!.BoundingBox || {},
            confidence: fr.Face!.Confidence ?? 0,
            quality: fr.FaceDetail?.Quality || null,
            pose: fr.FaceDetail?.Pose || null,
          }));
          const { error: insErr } = await admin.from("event_photo_faces").insert(rows);
          if (insErr) throw insErr;
        }

        await admin.from("event_photos").update({
          faces_indexed_at: new Date().toISOString(),
        }).eq("id", item.photo_id);

        if (item.job_id) {
          await admin.rpc("mark_face_index_done", { _job_id: item.job_id, _faces_count: faceRecords.length });
        } else {
          // backfill: incrementa contador na collection mesmo sem job
          await admin.from("event_face_collections").update({
            faces_indexed: (await admin.from("event_face_collections").select("faces_indexed").eq("event_id", event_id).maybeSingle()).data?.faces_indexed
              ? undefined : 0,
            last_indexed_at: new Date().toISOString(),
          }).eq("event_id", event_id);
        }

        processed++;
        totalFaces += faceRecords.length;
        const dur = Date.now() - t0;
        log("info", {
          event_id, photo_id: item.photo_id, job_id: item.job_id,
          faces_count: faceRecords.length, used_medium: usedMedium, duration_ms: dur,
        });
        details.push({ photo_id: item.photo_id, faces: faceRecords.length, used_medium: usedMedium, duration_ms: dur, outcome: "done" });
      } catch (e) {
        const name = (e as any)?.name || "UnknownError";
        const message = (e as any)?.message || String(e);
        const permanent = PERMANENT_ERRORS.has(name);
        log("error", {
          event_id, photo_id: item.photo_id, job_id: item.job_id,
          error_code: name, error_message: message, permanent,
        });
        if (item.job_id) {
          await admin.rpc("mark_face_index_error", {
            _job_id: item.job_id,
            _error_code: name,
            _error_message: message,
            _permanent: permanent,
          });
        }
        details.push({ photo_id: item.photo_id, outcome: "error", error_code: name, permanent });
      }
    }

    return jsonResponse({
      ok: true,
      event_id,
      collection_id,
      processed,
      total_faces: totalFaces,
      details,
      remaining_hint: claimed.length === effectiveLimit
        ? "Há mais fotos pendentes — clique novamente para processar o próximo lote."
        : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("error", { err: msg });
    return jsonResponse({ error: msg }, 500);
  }
});