import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-video-lambda-secret",
};

// Endpoint interno, chamado SOMENTE pelo Lambda viufoto-video-processor
// (AWS) ao final de cada processamento de vídeo — nunca pelo frontend.
// Autenticado por um segredo compartilhado (não pelo JWT do usuário, pois
// o Lambda não tem sessão de usuário) para poder usar a SERVICE_ROLE_KEY
// e atualizar event_videos sem passar pelas RLS policies de escrita do
// fotógrafo dono do vídeo.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const expectedSecret = Deno.env.get("VIDEO_LAMBDA_SHARED_SECRET");
  const providedSecret = req.headers.get("x-video-lambda-secret");
  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      file_url,
      status,
      duration_seconds,
      width,
      height,
      codec,
      file_size_bytes,
      thumbnail_url,
      poster_url,
      preview_url,
      processing_error,
    } = body;

    if (!file_url || !status) {
      return new Response(JSON.stringify({ error: "file_url and status are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["pending", "processing", "ready", "failed"].includes(status)) {
      return new Response(JSON.stringify({ error: "invalid status" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const updateData: Record<string, unknown> = { status };
    if (duration_seconds !== undefined) updateData.duration_seconds = duration_seconds;
    if (width !== undefined) updateData.width = width;
    if (height !== undefined) updateData.height = height;
    if (codec !== undefined) updateData.codec = codec;
    if (file_size_bytes !== undefined) updateData.file_size_bytes = file_size_bytes;
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
    if (poster_url !== undefined) updateData.poster_url = poster_url;
    if (preview_url !== undefined) updateData.preview_url = preview_url;
    if (processing_error !== undefined) updateData.processing_error = processing_error;
    if (status === "ready" || status === "failed") updateData.processed_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("event_videos")
      .update(updateData)
      .eq("file_url", file_url)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("video-processing-callback update error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!data) {
      console.warn("video-processing-callback: no event_videos row found for file_url:", file_url);
      return new Response(JSON.stringify({ error: "video row not found", file_url }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("video-processing-callback error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});