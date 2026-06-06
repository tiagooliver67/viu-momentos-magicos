import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function extractPhotoId(input: string): string | null {
  if (!input) return null;
  // Try /foto/<uuid> first
  const fotoMatch = input.match(/\/foto\/([0-9a-f-]{36})/i);
  if (fotoMatch) return fotoMatch[1];
  // Fallback: any UUID inside the string
  const m = input.match(UUID_RE);
  return m ? m[0] : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const message: string = String(body.message ?? "").trim();
    const photoUrl: string = String(body.photo_url ?? "").trim();
    const attachmentPath: string | null = body.attachment_url ?? null;
    const userName: string | null = body.user_name ?? null;

    if (message.length < 10) {
      return new Response(JSON.stringify({ error: "Mensagem muito curta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Try to identify the photo / photographer
    let photoId: string | null = null;
    let eventId: string | null = null;
    let assignedPhotographerId: string | null = null;

    const candidateId = extractPhotoId(`${photoUrl} ${message}`);
    if (candidateId) {
      const { data: photo } = await admin
        .from("event_photos")
        .select("id, event_id, photographer_id")
        .eq("id", candidateId)
        .maybeSingle();
      if (photo) {
        photoId = photo.id;
        eventId = photo.event_id;
        assignedPhotographerId = photo.photographer_id;
        // Fallback to event organizer if no specific photographer on the row
        if (!assignedPhotographerId && eventId) {
          const { data: ev } = await admin.from("events").select("organizer_id").eq("id", eventId).maybeSingle();
          if (ev?.organizer_id) assignedPhotographerId = ev.organizer_id;
        }
      }
    }

    const escalateAfter = assignedPhotographerId
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: ticket, error: insertErr } = await admin
      .from("support_tickets")
      .insert({
        user_id: user.id,
        user_email: user.email ?? "",
        user_name: userName,
        category: "Privacidade e Remoção",
        subject: "Remoção de Foto",
        message,
        photo_url: photoUrl || null,
        photo_id: photoId,
        event_id: eventId,
        assigned_photographer_id: assignedPhotographerId,
        attachment_url: attachmentPath,
        escalate_after: escalateAfter,
        status: "aberto",
      })
      .select()
      .single();

    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        ticket_id: ticket.id,
        routed_to: assignedPhotographerId ? "photographer" : "super_admin",
        identified_photo: !!photoId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});