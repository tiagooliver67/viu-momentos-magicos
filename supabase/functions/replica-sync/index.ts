// Edge Function: replica-sync
// Sincroniza incrementalmente tabelas críticas do banco principal
// para um Supabase externo (réplica/backup), usando watermark por updated_at/created_at.
// Disparada por pg_cron a cada 5 minutos.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAIN_URL = Deno.env.get("SUPABASE_URL")!;
const MAIN_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REPLICA_URL = Deno.env.get("REPLICA_SUPABASE_URL")!;
const REPLICA_SERVICE_KEY = Deno.env.get("REPLICA_SUPABASE_SERVICE_KEY")!;

// Lista de tabelas a replicar. `ts` = coluna usada como watermark.
// Use `updated_at` quando existir, senão `created_at` para tabelas append-only.
const TABLES: { name: string; ts: string; pk?: string }[] = [
  { name: "profiles", ts: "updated_at" },
  { name: "user_roles", ts: "created_at" },
  { name: "events", ts: "updated_at" },
  { name: "event_photos", ts: "created_at" },
  { name: "event_videos", ts: "created_at" },
  { name: "event_photographers", ts: "created_at" },
  { name: "event_partners", ts: "created_at" },
  { name: "event_applications", ts: "updated_at" },
  { name: "event_coupons", ts: "created_at" },
  { name: "price_grids", ts: "created_at" },
  { name: "discount_packages", ts: "created_at" },
  { name: "photo_bib_numbers", ts: "detected_at" },
  { name: "event_indexing_progress", ts: "last_updated_at", pk: "event_id" },
  { name: "bib_detection_errors", ts: "created_at" },
  { name: "orders", ts: "updated_at" },
  { name: "order_items", ts: "created_at" },
  { name: "photographer_sites", ts: "updated_at" },
  { name: "custom_links", ts: "created_at" },
  { name: "proposals", ts: "updated_at" },
  { name: "proposal_comments", ts: "created_at" },
  { name: "proposal_attachments", ts: "created_at" },
  { name: "withdrawal_accounts", ts: "created_at" },
  { name: "withdrawal_logs", ts: "created_at" },
  { name: "admin_audit_log", ts: "created_at" },
  { name: "registration_events", ts: "updated_at" },
  { name: "event_registrations", ts: "updated_at" },
  { name: "registration_categories", ts: "created_at" },
  { name: "registration_price_tiers", ts: "created_at" },
  { name: "registration_shirt_stock", ts: "created_at" },
  { name: "hero_settings", ts: "updated_at" },
  { name: "hero_slides", ts: "created_at" },
];

const BATCH = 1000;
const MAX_ROWS_PER_TABLE = 20000; // cap por execução para evitar timeout

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!REPLICA_URL || !REPLICA_SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: "REPLICA_SUPABASE_URL / REPLICA_SUPABASE_SERVICE_KEY ausentes" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const main = createClient(MAIN_URL, MAIN_SERVICE_KEY, { auth: { persistSession: false } });
  const replica = createClient(REPLICA_URL, REPLICA_SERVICE_KEY, {
    auth: { persistSession: false },
    db: { schema: "replica" },
  });

  const summary: Record<string, { synced: number; watermark: string | null; error?: string }> = {};
  const startedAt = Date.now();

  for (const t of TABLES) {
    try {
      // 1. Lê watermark atual
      const { data: state } = await main
        .from("sync_state")
        .select("last_synced_at")
        .eq("table_name", t.name)
        .maybeSingle();
      const since = state?.last_synced_at ?? "1970-01-01T00:00:00Z";

      let totalSynced = 0;
      let lastWatermark = since;
      let cursor = since;

      // 2. Pagina por watermark
      while (totalSynced < MAX_ROWS_PER_TABLE) {
        const { data: rows, error } = await main
          .from(t.name)
          .select("*")
          .gt(t.ts, cursor)
          .order(t.ts, { ascending: true })
          .limit(BATCH);
        if (error) throw error;
        if (!rows || rows.length === 0) break;

        // 3. UPSERT na réplica
        const pk = t.pk ?? "id";
        const { error: upErr } = await replica.from(t.name).upsert(rows, { onConflict: pk });
        if (upErr) throw upErr;

        totalSynced += rows.length;
        const newWm = (rows[rows.length - 1] as any)[t.ts];
        if (newWm) {
          lastWatermark = newWm;
          cursor = newWm;
        }
        if (rows.length < BATCH) break;
      }

      // 4. Atualiza watermark no banco principal
      await main.from("sync_state").upsert(
        {
          table_name: t.name,
          last_synced_at: lastWatermark,
          last_run_at: new Date().toISOString(),
          last_rows_synced: totalSynced,
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "table_name" }
      );

      // 5. Log na réplica
      await replica.from("_sync_log").insert({
        table_name: t.name,
        rows_synced: totalSynced,
        watermark: lastWatermark,
      });

      summary[t.name] = { synced: totalSynced, watermark: lastWatermark };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      summary[t.name] = { synced: 0, watermark: null, error: msg };
      await main.from("sync_state").upsert(
        {
          table_name: t.name,
          last_run_at: new Date().toISOString(),
          last_error: msg.slice(0, 500),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "table_name" }
      );
    }
  }

  const totalRows = Object.values(summary).reduce((s, x) => s + x.synced, 0);
  return new Response(
    JSON.stringify({
      ok: true,
      duration_ms: Date.now() - startedAt,
      total_rows: totalRows,
      tables: summary,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});