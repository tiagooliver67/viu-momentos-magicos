import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ACCESS_TTL_HOURS = 12;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = () => createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

async function userFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return null;
  const client = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

/** Retorna o registro de acesso válido, ou null. */
async function validAccess(db: ReturnType<typeof admin>, eventId: string, token: unknown) {
  if (typeof token !== "string" || token.length < 20) return null;
  const { data } = await db
    .from("event_access")
    .select("id, event_id, expires_at")
    .eq("token", token)
    .eq("event_id", eventId)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const action = body?.action;
  const eventId = body?.event_id;
  if (!isUuid(eventId)) return json({ error: "invalid_body" }, 400);

  const db = admin();

  try {
    // ---------- Define/remove a senha do evento (somente organizador) ----------
    if (action === "set_password") {
      const user = await userFromRequest(req);
      if (!user) return json({ error: "unauthorized" }, 401);

      const { data: ev } = await db
        .from("events")
        .select("id, organizer_id")
        .eq("id", eventId)
        .maybeSingle();
      if (!ev || ev.organizer_id !== user.id) return json({ error: "forbidden" }, 403);

      const password = body?.password;
      if (password === null || password === undefined || String(password).trim() === "") {
        await db.from("event_passwords").delete().eq("event_id", eventId);
        await db.from("event_access").delete().eq("event_id", eventId);
        await db.from("events").update({ has_password: false }).eq("id", eventId);
        return json({ ok: true, has_password: false });
      }

      const plain = String(password);
      if (plain.length < 4 || plain.length > 128) {
        return json({ error: "invalid_password", message: "A senha deve ter entre 4 e 128 caracteres." }, 400);
      }

      const { data: hashRow, error: hashError } = await db.rpc("hash_event_password", { _password: plain });
      if (hashError) throw hashError;

      const { error: upsertError } = await db
        .from("event_passwords")
        .upsert({ event_id: eventId, password_hash: hashRow as unknown as string }, { onConflict: "event_id" });
      if (upsertError) throw upsertError;

      // Senha trocada invalida acessos antigos
      await db.from("event_access").delete().eq("event_id", eventId);
      await db.from("events").update({ has_password: true }).eq("id", eventId);
      return json({ ok: true, has_password: true });
    }

    // ---------- Valida a senha e emite um token de acesso ----------
    if (action === "verify") {
      const password = typeof body?.password === "string" ? body.password : "";
      // Mensagem genérica sempre: não diferencia "evento inexistente" de "senha errada"
      const generic = json({ error: "invalid_credentials", message: "Senha incorreta." }, 401);
      if (!password || password.length > 128) return generic;

      const { data: ok, error } = await db.rpc("verify_event_password", {
        _event_id: eventId,
        _password: password,
      });
      if (error) throw error;
      if (ok !== true) return generic;

      const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
      const expiresAt = new Date(Date.now() + ACCESS_TTL_HOURS * 3600 * 1000).toISOString();
      const { error: insErr } = await db.from("event_access").insert({
        event_id: eventId,
        token,
        session_id: typeof body?.session_id === "string" ? body.session_id.slice(0, 100) : null,
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        expires_at: expiresAt,
      });
      if (insErr) throw insErr;

      return json({ ok: true, token, expires_at: expiresAt });
    }

    // ---------- Conteúdo do evento protegido, mediante token válido ----------
    if (action === "gallery") {
      const access = await validAccess(db, eventId, body?.token);
      if (!access) return json({ error: "access_denied" }, 401);

      const [{ data: photos }, { data: videos }] = await Promise.all([
        db.from("event_photos").select("*").eq("event_id", eventId).order("created_at"),
        db.from("event_videos").select("*").eq("event_id", eventId).order("created_at"),
      ]);

      return json({
        ok: true,
        photos: photos ?? [],
        videos: (videos ?? []).filter((v: any) => v.status === "ready"),
      });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("event-access error", e);
    return json({ error: "internal_error" }, 500);
  }
});
