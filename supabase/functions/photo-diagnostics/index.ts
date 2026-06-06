/**
 * photo-diagnostics — Super Admin per-photo health check.
 * Returns DB state + HEAD checks on S3 derivatives (original / thumb / medium).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev";

function toThumbPath(p: string) {
  return p.replace(/\/fotos\//, "/fotos/thumb/").replace(/\.(jpe?g|png)$/i, ".webp");
}
function toMediumPath(p: string) {
  return p.replace(/\/fotos\//, "/fotos/medium/").replace(/\.(jpe?g|png)$/i, ".webp");
}

async function signRead(path: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const AWS_S3_API_KEY = Deno.env.get("AWS_S3_API_KEY");
  if (!LOVABLE_API_KEY || !AWS_S3_API_KEY) return null;
  try {
    const r = await fetch(`${GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": AWS_S3_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ object_path: path }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.url ?? null;
  } catch { return null; }
}

async function headExists(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const photoId = String(body.photoId || "");
    if (!photoId) return json({ error: "photoId required" }, 400);

    const { data: photo, error: photoErr } = await admin
      .from("event_photos")
      .select("id, event_id, photographer_id, file_url, file_name, created_at, indexing_status, bibs_indexed_at, bibs_count")
      .eq("id", photoId)
      .maybeSingle();
    if (photoErr || !photo) return json({ error: "photo_not_found" }, 404);

    const [{ data: event }, { data: bibs }, { data: errors }] = await Promise.all([
      admin.from("events").select("id, name, organizer_id, bib_search_enabled").eq("id", photo.event_id).maybeSingle(),
      admin.from("photo_bib_numbers").select("number, confidence, bbox, detected_at").eq("photo_id", photoId).order("confidence", { ascending: false }),
      admin.from("bib_detection_errors").select("error_code, error_message, created_at, retry_count").eq("photo_id", photoId).order("created_at", { ascending: false }).limit(10),
    ]);

    const originalPath = photo.file_url;
    const thumbPath = toThumbPath(originalPath);
    const mediumPath = toMediumPath(originalPath);

    const [originalUrl, thumbUrl, mediumUrl] = await Promise.all([
      signRead(originalPath),
      signRead(thumbPath),
      signRead(mediumPath),
    ]);
    const [originalOk, thumbOk, mediumOk] = await Promise.all([
      originalUrl ? headExists(originalUrl) : Promise.resolve(false),
      thumbUrl ? headExists(thumbUrl) : Promise.resolve(false),
      mediumUrl ? headExists(mediumUrl) : Promise.resolve(false),
    ]);

    const ocrExecuted = !!photo.bibs_indexed_at;
    const ocrFoundNumber = (photo.bibs_count || 0) > 0;
    const indexedForSearch = (bibs?.length || 0) > 0;

    return json({
      photo: {
        id: photo.id,
        event_id: photo.event_id,
        event_name: event?.name ?? null,
        photographer_id: photo.photographer_id,
        file_name: photo.file_name,
        file_url: photo.file_url,
        created_at: photo.created_at,
        indexing_status: photo.indexing_status,
        bibs_indexed_at: photo.bibs_indexed_at,
        bibs_count: photo.bibs_count,
      },
      paths: { original: originalPath, thumb: thumbPath, medium: mediumPath },
      urls: { original: originalUrl, thumb: thumbUrl, medium: mediumUrl },
      checklist: {
        original_exists: originalOk,
        thumb_exists: thumbOk,
        medium_exists: mediumOk,
        ocr_executed: ocrExecuted,
        ocr_found_number: ocrFoundNumber,
        indexed_for_search: indexedForSearch,
      },
      bibs: bibs ?? [],
      errors: errors ?? [],
    });
  } catch (err) {
    console.error(JSON.stringify({ level: "error", event: "photo_diagnostics_failed", message: String(err) }));
    return json({ error: "internal_error" }, 500);
  }

  function json(b: unknown, status = 200) {
    return new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});