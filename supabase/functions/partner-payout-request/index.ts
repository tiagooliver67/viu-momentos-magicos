import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MIN_PAYOUT = 50;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing_auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Confirma adesão aprovada
    const { data: app } = await admin.from("partner_applications")
      .select("status, pix_key, pix_key_type").eq("user_id", user.id).maybeSingle();
    if (!app || app.status !== "approved") {
      return new Response(JSON.stringify({ error: "not_approved" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!app.pix_key) {
      return new Response(JSON.stringify({ error: "pix_key_missing" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calcula saldo disponível
    const { data: rows } = await admin
      .from("referral_earnings")
      .select("id, commission_amount")
      .eq("referrer_id", user.id)
      .eq("status", "available");

    const available = (rows ?? []).reduce((s, r: any) => s + Number(r.commission_amount ?? 0), 0);
    if (available < MIN_PAYOUT) {
      return new Response(JSON.stringify({ error: "below_minimum", available, minimum: MIN_PAYOUT }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cria payout
    const { data: payout, error: payoutErr } = await admin
      .from("partner_payouts")
      .insert({
        user_id: user.id,
        amount: available,
        pix_key: app.pix_key,
        pix_key_type: app.pix_key_type,
        status: "requested",
      })
      .select()
      .single();

    if (payoutErr) throw payoutErr;

    // Linka earnings
    const ids = (rows ?? []).map((r: any) => r.id);
    if (ids.length > 0) {
      await admin.from("referral_earnings")
        .update({ status: "requested", payout_id: payout.id })
        .in("id", ids);
    }

    return new Response(JSON.stringify({ ok: true, payout }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});