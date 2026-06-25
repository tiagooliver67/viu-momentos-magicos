import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
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

    // Verifica super_admin
    const { data: roles } = await admin.from("user_roles")
      .select("role").eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "super_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { payout_id, action, tx_id, notes } = body as {
      payout_id: string; action: "paid" | "rejected" | "processing"; tx_id?: string; notes?: string;
    };

    if (!payout_id || !["paid", "rejected", "processing"].includes(action)) {
      return new Response(JSON.stringify({ error: "invalid_input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const update: any = { status: action, reviewed_by: user.id, notes };
    if (action === "paid") { update.paid_at = now; update.tx_id = tx_id ?? null; }
    if (action === "processing") update.processed_at = now;

    const { data: payout, error } = await admin.from("partner_payouts")
      .update(update).eq("id", payout_id).select().single();
    if (error) throw error;

    if (action === "paid") {
      await admin.from("referral_earnings")
        .update({ status: "paid", paid_at: now })
        .eq("payout_id", payout_id);
    } else if (action === "rejected") {
      // Devolve earnings ao status 'available' e desconecta o payout
      await admin.from("referral_earnings")
        .update({ status: "available", payout_id: null })
        .eq("payout_id", payout_id);
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