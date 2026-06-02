import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { RekognitionClient, DetectTextCommand } from "npm:@aws-sdk/client-rekognition@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AWS_REGION = Deno.env.get("AWS_REKOGNITION_REGION") || "sa-east-1";
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_REKOGNITION_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_REKOGNITION_SECRET_ACCESS_KEY")!;
const S3_BUCKET = "viufoto-images-bucket";

const rek = new RekognitionClient({
  region: AWS_REGION,
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
    const { event_id, force = false, limit = 50 } = body as { event_id?: string; force?: boolean; limit?: number };
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

    let q = admin.from("event_photos").select("id, file_url, bibs_indexed_at").eq("event_id", event_id).order("created_at", { ascending: false }).limit(Math.min(Math.max(limit, 1), 200));
    if (!force) q = q.is("bibs_indexed_at", null);
    const { data: photos, error: photosErr } = await q;
    if (photosErr) throw photosErr;

    let processed = 0;
    let totalDetections = 0;
    const errors: Array<{ photo_id: string; message: string }> = [];

    for (const p of photos || []) {
      const key = extractKey(p.file_url);
      try {
        const out = await rek.send(new DetectTextCommand({
          Image: { S3Object: { Bucket: S3_BUCKET, Name: key } },
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
      } catch (e) {
        const anyE = e as any;
        const name = anyE?.name || "UnknownError";
        const message = anyE?.message || String(e);
        const httpStatus = anyE?.$metadata?.httpStatusCode ?? null;
        const fault = anyE?.$fault ?? null;
        const awsCode = anyE?.Code ?? null;
        const stack = anyE?.stack || null;
        const diag = {
          bucket: S3_BUCKET,
          key,
          region: AWS_REGION,
          name,
          message,
          httpStatus,
          fault,
          awsCode,
          stack,
        };
        console.error("[bib-reindex-event] Rekognition failure", JSON.stringify(diag));
        errors.push({ photo_id: p.id, message: `${name}: ${message}` });
        await admin.from("bib_detection_errors").insert({
          photo_id: p.id,
          event_id,
          s3_key: key,
          error_code: name,
          error_message: JSON.stringify({ message, httpStatus, fault, awsCode, region: AWS_REGION, bucket: S3_BUCKET, stack }),
        });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      event_id,
      processed,
      total_detections: totalDetections,
      errors_count: errors.length,
      errors: errors.slice(0, 10),
      remaining_hint: (photos?.length || 0) === Math.min(Math.max(limit, 1), 200) ? "Há mais fotos; rode novamente." : null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});