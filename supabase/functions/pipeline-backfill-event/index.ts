/**
 * pipeline-backfill-event
 *
 * Reenfileira fotos existentes nas filas SQS `viufoto-bib-queue` e/ou
 * `viufoto-face-queue` para reprocessamento (BIB OCR e/ou Face IndexFaces).
 *
 * Modos:
 *  - single event: { event_id, targets?: ["bib","face"], force?: boolean }
 *  - batch:        { scope: "all_events", targets?: ["bib","face"], force?: boolean,
 *                     only_enabled?: boolean (default true) }
 *
 * Comportamento:
 *  - `targets` default = ["bib","face"].
 *  - `force = false` (default): pula fotos já indexadas (bibs_indexed_at/faces_indexed_at IS NOT NULL para o alvo correspondente).
 *  - `force = true`: reenfileira todas as fotos, mesmo já indexadas.
 *  - Respeita `events.bib_search_enabled` / `events.face_search_enabled` (target é ignorado se desabilitado no evento).
 *  - `face_index_mode = 'on_demand'` faz o target `face` ser pulado (a Lambda também ignoraria).
 *  - Sends SQS messages usando o padrão S3 EventNotification (mesmo envelope que a Lambda espera).
 *
 * Autorização: super_admin OU organizador do evento OU fotógrafo do evento.
 * Batch (all_events): apenas super_admin.
 *
 * Env obrigatórias:
 *  - AWS_REKOGNITION_ACCESS_KEY_ID / AWS_REKOGNITION_SECRET_ACCESS_KEY (o IAM user precisa de sqs:SendMessage nas 2 filas)
 *  - AWS_SQS_BIB_QUEUE_URL, AWS_SQS_FACE_QUEUE_URL
 *  - AWS_SQS_REGION (default: sa-east-1)
 *  - S3_BUCKET (default: viufoto-images-bucket)
 *  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { AwsClient } from "npm:aws4fetch@1.0.20";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const AWS_KEY = Deno.env.get("AWS_REKOGNITION_ACCESS_KEY_ID")!;
const AWS_SECRET = Deno.env.get("AWS_REKOGNITION_SECRET_ACCESS_KEY")!;
const SQS_REGION = Deno.env.get("AWS_SQS_REGION") || "sa-east-1";
const BIB_QUEUE_URL = Deno.env.get("AWS_SQS_BIB_QUEUE_URL") || "";
const FACE_QUEUE_URL = Deno.env.get("AWS_SQS_FACE_QUEUE_URL") || "";
const S3_BUCKET = Deno.env.get("S3_BUCKET") || "viufoto-images-bucket";

type Target = "bib" | "face";

const aws = new AwsClient({
  accessKeyId: AWS_KEY,
  secretAccessKey: AWS_SECRET,
  service: "sqs",
  region: SQS_REGION,
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function log(payload: Record<string, unknown>) {
  console.log(JSON.stringify({ fn: "pipeline-backfill-event", ts: new Date().toISOString(), ...payload }));
}

/** Build the SQS body that mirrors an S3 EventNotification wrapped in SNS "Notification". */
function buildSqsMessage(s3Key: string): string {
  const s3Envelope = {
    Records: [
      {
        eventVersion: "2.1",
        eventSource: "aws:s3",
        eventName: "ObjectCreated:Backfill",
        s3: {
          bucket: { name: S3_BUCKET },
          object: { key: s3Key },
        },
      },
    ],
  };
  // Lambda aceita tanto envelope direto quanto SNS Notification.
  // Usamos o envelope SNS para casar exatamente com o fluxo real.
  return JSON.stringify({
    Type: "Notification",
    Message: JSON.stringify(s3Envelope),
  });
}

async function sendToSqs(queueUrl: string, body: string): Promise<void> {
  const form = new URLSearchParams({
    Action: "SendMessage",
    Version: "2012-11-05",
    MessageBody: body,
  });
  const res = await aws.fetch(queueUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SQS SendMessage failed [${res.status}] ${text}`);
  }
}

/** Envia em lotes controlados para não estourar tempo de execução. */
async function sendBatch(queueUrl: string, keys: string[], concurrency = 8): Promise<{ sent: number; errors: number }> {
  let sent = 0;
  let errors = 0;
  for (let i = 0; i < keys.length; i += concurrency) {
    const slice = keys.slice(i, i + concurrency);
    const results = await Promise.allSettled(slice.map((k) => sendToSqs(queueUrl, buildSqsMessage(k))));
    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        errors++;
        log({ level: "error", msg: "sqs_send_failed", err: (r.reason as Error)?.message });
      }
    }
  }
  return { sent, errors };
}

type EventRow = {
  id: string;
  bib_search_enabled: boolean | null;
  face_search_enabled: boolean | null;
  face_index_mode: string | null;
};

async function fetchEvent(admin: ReturnType<typeof createClient>, eventId: string): Promise<EventRow | null> {
  const { data } = await admin
    .from("events")
    .select("id, bib_search_enabled, face_search_enabled, face_index_mode")
    .eq("id", eventId)
    .maybeSingle();
  return (data as EventRow) || null;
}

async function fetchPhotoKeys(
  admin: ReturnType<typeof createClient>,
  eventId: string,
  target: Target,
  force: boolean,
): Promise<string[]> {
  const col = target === "bib" ? "bibs_indexed_at" : "faces_indexed_at";
  let q = admin.from("event_photos").select("file_url").eq("event_id", eventId).limit(50000);
  if (!force) q = q.is(col, null);
  const { data, error } = await q;
  if (error) throw error;
  return (data || [])
    .map((r: any) => (r.file_url as string) || "")
    .filter((k) => !!k && !k.includes("/thumb/") && !k.includes("/medium/"));
}

async function processEvent(
  admin: ReturnType<typeof createClient>,
  eventId: string,
  targets: Target[],
  force: boolean,
) {
  const ev = await fetchEvent(admin, eventId);
  if (!ev) return { event_id: eventId, skipped: "event_not_found" };

  const summary: Record<string, unknown> = { event_id: eventId };

  for (const t of targets) {
    if (t === "bib" && ev.bib_search_enabled === false) {
      summary[`${t}`] = { skipped: "bib_search_disabled" };
      continue;
    }
    if (t === "face" && ev.face_search_enabled === false) {
      summary[`${t}`] = { skipped: "face_search_disabled" };
      continue;
    }
    if (t === "face" && ev.face_index_mode === "on_demand") {
      summary[`${t}`] = { skipped: "face_index_mode_on_demand" };
      continue;
    }
    const queueUrl = t === "bib" ? BIB_QUEUE_URL : FACE_QUEUE_URL;
    if (!queueUrl) {
      summary[`${t}`] = { skipped: `queue_url_not_configured (AWS_SQS_${t.toUpperCase()}_QUEUE_URL)` };
      continue;
    }
    const keys = await fetchPhotoKeys(admin, eventId, t, force);
    if (keys.length === 0) {
      summary[`${t}`] = { enqueued: 0, errors: 0, msg: "nothing_to_enqueue" };
      continue;
    }
    const { sent, errors } = await sendBatch(queueUrl, keys);
    summary[`${t}`] = { enqueued: sent, errors, total_candidates: keys.length };
    log({ event_id: eventId, target: t, enqueued: sent, errors, force });
  }

  return summary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!AWS_KEY || !AWS_SECRET) {
      return json({ error: "AWS_REKOGNITION_* credentials not configured" }, 500);
    }

    // Autenticação: usa o token do caller para descobrir user + roles.
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: superAdminRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    const isSuperAdmin = !!superAdminRow;

    const raw = await req.json().catch(() => ({}));
    const rawTargets: unknown = (raw as any)?.targets;
    const targets: Target[] = Array.isArray(rawTargets) && rawTargets.length > 0
      ? (rawTargets as string[]).filter((t) => t === "bib" || t === "face") as Target[]
      : ["bib", "face"];
    const force = Boolean((raw as any)?.force);

    // ---- BATCH MODE ----
    if ((raw as any)?.scope === "all_events") {
      if (!isSuperAdmin) return json({ error: "Forbidden (super_admin only for batch mode)" }, 403);

      const onlyEnabled = (raw as any)?.only_enabled !== false; // default true
      let q = admin.from("events").select("id, bib_search_enabled, face_search_enabled");
      if (onlyEnabled) {
        // pelo menos uma das buscas habilitada para o alvo pedido
        const ors: string[] = [];
        if (targets.includes("bib")) ors.push("bib_search_enabled.eq.true");
        if (targets.includes("face")) ors.push("face_search_enabled.eq.true");
        if (ors.length > 0) q = q.or(ors.join(","));
      }
      const { data: events, error } = await q;
      if (error) throw error;

      const results: unknown[] = [];
      let totalBib = 0;
      let totalFace = 0;
      let totalErrors = 0;
      for (const e of (events || []) as { id: string }[]) {
        const r = await processEvent(admin, e.id, targets, force) as any;
        results.push(r);
        totalBib += (r?.bib?.enqueued as number) || 0;
        totalFace += (r?.face?.enqueued as number) || 0;
        totalErrors += ((r?.bib?.errors as number) || 0) + ((r?.face?.errors as number) || 0);
      }

      return json({
        ok: true,
        mode: "batch",
        events_processed: (events || []).length,
        total_enqueued: { bib: totalBib, face: totalFace },
        total_errors: totalErrors,
        force,
        targets,
        details: results,
      });
    }

    // ---- SINGLE EVENT MODE ----
    const event_id = (raw as any)?.event_id as string | undefined;
    if (!event_id) return json({ error: "event_id required (or scope='all_events')" }, 400);

    // Autorização: super_admin OU organizador OU fotógrafo do evento
    if (!isSuperAdmin) {
      const [{ data: ev }, { data: photog }] = await Promise.all([
        admin.from("events").select("organizer_id").eq("id", event_id).maybeSingle(),
        admin.from("event_photographers")
          .select("photographer_id")
          .eq("event_id", event_id)
          .eq("photographer_id", user.id)
          .maybeSingle(),
      ]);
      const isOrganizer = ev?.organizer_id === user.id;
      const isPhotog = !!photog;
      if (!isOrganizer && !isPhotog) return json({ error: "Forbidden" }, 403);
    }

    const summary = await processEvent(admin, event_id, targets, force);
    return json({ ok: true, mode: "single", force, targets, ...summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log({ level: "error", err: msg });
    return json({ error: msg }, 500);
  }
});