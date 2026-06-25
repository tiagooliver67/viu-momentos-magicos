/**
 * generate-photographer-bio
 * Generates a short AI bio (PT-BR) for a photographer's public page.
 * Caches via signature in photographer_sites.ai_bio_signature.
 * Public endpoint (no auth) — receives { user_id } and returns { bio }.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BIO_CHARS = 500;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + "…";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  let body: { user_id?: string } = {};
  try { body = await req.json(); } catch { /* noop */ }
  const userId = body.user_id;
  if (!userId || typeof userId !== "string") return jsonResponse({ error: "invalid_user_id" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1) Site (must exist)
  const { data: site } = await supabase
    .from("photographer_sites")
    .select("user_id, display_name, bio, ai_bio, ai_bio_signature, ai_bio_generated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!site) return jsonResponse({ error: "photographer_not_found" }, 404);

  // 2) Gather facts
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: level } = await supabase
    .from("photographer_levels")
    .select("current_level, events_count, sales_count")
    .eq("user_id", userId)
    .maybeSingle();

  // Events organized by user, to count and infer categories/cities
  const { data: events } = await supabase
    .from("events")
    .select("id, category, location")
    .eq("organizer_id", userId);

  const eventIds = (events ?? []).map((e: any) => e.id);
  let photoCount = 0;
  if (eventIds.length > 0) {
    const { count } = await supabase
      .from("event_photos")
      .select("*", { count: "exact", head: true })
      .in("event_id", eventIds);
    photoCount = count ?? 0;
  }

  // Top 3 categories
  const catFreq = new Map<string, number>();
  for (const e of (events ?? []) as any[]) {
    const c = (e.category || "").toString().trim().toLowerCase();
    if (!c) continue;
    catFreq.set(c, (catFreq.get(c) ?? 0) + 1);
  }
  const topCategories = [...catFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  // Top city (from events.location, take last segment after comma if present)
  const cityFreq = new Map<string, number>();
  for (const e of (events ?? []) as any[]) {
    const loc = (e.location || "").toString().trim();
    if (!loc) continue;
    const city = loc.split(/[-,]/).pop()!.trim();
    if (!city) continue;
    cityFreq.set(city, (cityFreq.get(city) ?? 0) + 1);
  }
  const topCity = [...cityFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Achievements (unlocked)
  const { data: achievements } = await supabase
    .from("photographer_achievements")
    .select("achievement_id, achievements(title)")
    .eq("user_id", userId);
  const achievementTitles = ((achievements ?? []) as any[])
    .map((a) => a?.achievements?.title)
    .filter(Boolean)
    .slice(0, 6);

  const yearsOnPlatform = profile?.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (365.25 * 24 * 3600 * 1000)))
    : 0;

  const facts = {
    display_name: site.display_name || profile?.full_name || "Fotógrafo",
    user_bio: site.bio || null,
    city: topCity,
    level: level?.current_level || "bronze",
    events_count: level?.events_count ?? (events?.length ?? 0),
    sales_count: level?.sales_count ?? 0,
    photo_count: photoCount,
    years_on_platform: yearsOnPlatform,
    top_categories: topCategories,
    achievements: achievementTitles,
  };

  const signature = await sha256(JSON.stringify(facts));

  // 3) Cache hit
  if (site.ai_bio && site.ai_bio_signature === signature) {
    return jsonResponse({ bio: site.ai_bio, cached: true });
  }

  // 4) Call AI gateway
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return jsonResponse({ error: "missing_lovable_api_key" }, 500);

  const system =
    "Você é um redator profissional. Escreva uma bio em português brasileiro, na 3ª pessoa, de 2 a 4 frases (máx. 400 caracteres), sobre um fotógrafo esportivo. Use SOMENTE os fatos fornecidos; NUNCA invente números, anos ou conquistas. Se um dado não estiver presente, omita. Tom: confiante, acolhedor, sem clichês, sem emojis, sem hashtags, sem listas. Retorne apenas o texto da bio.";

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: "Fatos:\n" + JSON.stringify(facts, null, 2) },
      ],
    }),
  });

  if (aiRes.status === 429) return jsonResponse({ error: "rate_limited" }, 429);
  if (aiRes.status === 402) return jsonResponse({ error: "credits_exhausted" }, 402);
  if (!aiRes.ok) {
    const t = await aiRes.text();
    console.error("ai_gateway_error", aiRes.status, t);
    return jsonResponse({ error: "ai_gateway_error" }, 502);
  }

  const aiJson = await aiRes.json();
  const raw = aiJson?.choices?.[0]?.message?.content ?? "";
  const bio = truncate(String(raw).replace(/\s+/g, " "), MAX_BIO_CHARS);
  if (!bio) return jsonResponse({ error: "empty_ai_response" }, 502);

  // 5) Persist
  await supabase
    .from("photographer_sites")
    .update({
      ai_bio: bio,
      ai_bio_signature: signature,
      ai_bio_generated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return jsonResponse({ bio, cached: false });
});