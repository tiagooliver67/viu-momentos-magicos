/**
 * health-snapshot — Super Admin observability dashboard data source.
 * Aggregates OCR, image-processor, search and infra metrics from existing tables.
 * Read-only. Requires super_admin role (validated in code).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Not authenticated" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("is_super_admin");
    // is_super_admin uses auth.uid() of the request — we re-check via user roles directly
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleRow && !isAdmin) return json({ error: "Forbidden" }, 403);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // OCR + image-processor aggregates from event_indexing_progress
    const { data: progress } = await admin
      .from("event_indexing_progress")
      .select("total_photos, bibs_done, bibs_errors, last_updated_at");

    const totals = (progress || []).reduce(
      (acc, r: any) => {
        acc.total += r.total_photos || 0;
        acc.done += r.bibs_done || 0;
        acc.errors += r.bibs_errors || 0;
        if (r.last_updated_at && r.last_updated_at > acc.last) acc.last = r.last_updated_at;
        return acc;
      },
      { total: 0, done: 0, errors: 0, last: "" }
    );
    const pending = Math.max(0, totals.total - totals.done - totals.errors);
    const successRate = totals.total > 0 ? (totals.done / totals.total) * 100 : 0;

    // Recent OCR errors (24h)
    const { count: errors24h } = await admin
      .from("bib_detection_errors")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h);

    // Photos / videos totals
    const { count: totalPhotos } = await admin
      .from("event_photos")
      .select("id", { count: "exact", head: true });
    const { count: doneRows } = await admin
      .from("event_photos")
      .select("id", { count: "exact", head: true })
      .not("bibs_indexed_at", "is", null);

    // Number of distinct bib numbers indexed (proxy for search readiness)
    const { count: indexedBibs } = await admin
      .from("photo_bib_numbers")
      .select("id", { count: "exact", head: true });

    const snapshot = {
      generated_at: new Date().toISOString(),
      ocr: {
        total: totals.total,
        processed: totals.done,
        pending,
        errors: totals.errors,
        errors_24h: errors24h ?? 0,
        success_rate: Number(successRate.toFixed(2)),
        last_updated_at: totals.last || null,
      },
      image_processor: {
        total_photos: totalPhotos ?? 0,
        with_derivatives_estimate: doneRows ?? 0,
      },
      search: {
        indexed_bib_rows: indexedBibs ?? 0,
        note: "Métricas de buscas em tempo-real virão na próxima fase (eventos client-log).",
      },
      infra: {
        sqs_configured: !!Deno.env.get("AWS_SQS_QUEUE_URL"),
        note: !Deno.env.get("AWS_SQS_QUEUE_URL")
          ? "SQS/DLQ não configurado nesta função (adicionar credenciais AWS_SQS_*)."
          : "Métricas SQS via CloudWatch (próxima fase).",
      },
    };

    return json(snapshot, 200);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", event: "health_snapshot_failed", message: String(err) }));
    return json({ error: "internal_error" }, 500);
  }

  function json(b: unknown, status = 200) {
    return new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});