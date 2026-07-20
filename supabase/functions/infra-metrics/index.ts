/**
 * infra-metrics — Real-time infrastructure metrics for Super Admin.
 * Queries pg_stat_* views via service role. Read-only. Requires super_admin.
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

    // Run all metric queries in parallel via a single RPC-like approach:
    // we use raw SQL via the pg-meta style — but Supabase JS doesn't expose raw SQL.
    // Instead we call a security-definer RPC we install in the same migration.
    const { data, error } = await admin.rpc("infra_metrics_snapshot");
    if (error) throw error;

    return json({ generated_at: new Date().toISOString(), ...data }, 200);
  } catch (err) {
    console.error(JSON.stringify({ level: "error", event: "infra_metrics_failed", message: String(err) }));
    return json({ error: "internal_error", detail: String(err) }, 500);
  }

  function json(b: unknown, status = 200) {
    return new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});