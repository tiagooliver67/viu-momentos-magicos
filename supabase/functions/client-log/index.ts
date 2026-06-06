/**
 * client-log — receives critical frontend errors and re-emits them as
 * structured JSON logs on the server side. No DB writes (zero cost).
 * Rate-limited per IP in-memory and payload-bounded to 4KB.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_PAYLOAD = 4 * 1024;
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map<string, { count: number; reset: number }>();

function allowed(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!allowed(ip)) {
    return new Response(JSON.stringify({ ok: false, throttled: true }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.text();
  if (raw.length > MAX_PAYLOAD) {
    return new Response(JSON.stringify({ ok: false, error: "payload_too_large" }), {
      status: 413,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown> = {};
  try { body = JSON.parse(raw); } catch { /* keep empty */ }

  const line = {
    level: String(body.level ?? "error"),
    event: String(body.event ?? "client_event"),
    component: String(body.component ?? "frontend"),
    eventId: body.eventId ?? null,
    photoId: body.photoId ?? null,
    url: body.url ?? null,
    ua: body.ua ?? null,
    ip,
    ts: new Date().toISOString(),
    ctx: body.ctx ?? null,
  };
  console.log(JSON.stringify(line));

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});