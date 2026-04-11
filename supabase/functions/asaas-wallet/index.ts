import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

function getAsaasKey(): string {
  const key = Deno.env.get("ASAAS_API_KEY");
  if (!key) throw new Error("ASAAS_API_KEY not configured");
  return key;
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function asaasFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: getAsaasKey(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("ASAAS error:", JSON.stringify(data));
    throw new Error(data.errors?.[0]?.description || `ASAAS error ${res.status}`);
  }
  return data;
}

async function getProfile(supabaseAdmin: any, userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("asaas_wallet_id, full_name, cpf_cnpj, phone")
    .eq("user_id", userId)
    .single();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = (body: any, status = 200) =>
      new Response(JSON.stringify(body), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // ─── CREATE WALLET ───
    if (action === "create_wallet") {
      const { name, email, cpfCnpj, phone } = params;

      if (!name || !email || !cpfCnpj) {
        return json({ error: "Nome, e-mail e CPF/CNPJ são obrigatórios" }, 400);
      }

      const profile = await getProfile(supabaseAdmin, user.id);
      if (profile?.asaas_wallet_id) {
        return json({ walletId: profile.asaas_wallet_id, message: "Carteira já configurada" });
      }

      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, "");
      const accountData: Record<string, unknown> = {
        name,
        email,
        cpfCnpj: cleanCpfCnpj,
        companyType: cleanCpfCnpj.length > 11 ? "LIMITED" : "MEI",
        loginEmail: email,
        ...(phone ? { phone: phone.replace(/\D/g, "") } : {}),
      };

      console.log("Creating Asaas subaccount for user:", user.id);
      const account = await asaasFetch("/accounts", {
        method: "POST",
        body: JSON.stringify(accountData),
      });

      const walletId = account.walletId || account.id;
      if (!walletId) throw new Error("Falha ao obter walletId da subconta Asaas");

      await supabaseAdmin
        .from("profiles")
        .update({ asaas_wallet_id: walletId, full_name: name, cpf_cnpj: cpfCnpj, phone: phone || null })
        .eq("user_id", user.id);

      console.log(`Wallet created: ${walletId} for user ${user.id}`);
      return json({ walletId, message: "Recebimento configurado com sucesso!" });
    }

    // ─── CHECK WALLET ───
    if (action === "check_wallet") {
      const profile = await getProfile(supabaseAdmin, user.id);
      return json({
        configured: !!profile?.asaas_wallet_id,
        walletId: profile?.asaas_wallet_id || null,
        name: profile?.full_name || null,
        cpfCnpj: profile?.cpf_cnpj || null,
        phone: profile?.phone || null,
      });
    }

    // ─── GET BALANCE ───
    if (action === "get_balance") {
      const profile = await getProfile(supabaseAdmin, user.id);
      if (!profile?.asaas_wallet_id) {
        return json({ balance: 0, pending: 0, configured: false });
      }

      try {
        const balanceData = await asaasFetch(`/finance/balance`);
        return json({
          balance: balanceData?.balance ?? 0,
          pending: balanceData?.statistics?.pending ?? 0,
          configured: true,
        });
      } catch (e: any) {
        console.error("Balance fetch error:", e.message);
        return json({ balance: 0, pending: 0, configured: true, error: e.message });
      }
    }

    // ─── REQUEST WITHDRAWAL (PIX) ───
    if (action === "request_withdrawal") {
      const { amount, pixKey, pixKeyType } = params;

      if (!amount || amount <= 0) {
        return json({ error: "Valor inválido para saque" }, 400);
      }

      const profile = await getProfile(supabaseAdmin, user.id);
      if (!profile?.asaas_wallet_id) {
        return json({ error: "Carteira não configurada. Configure seu recebimento primeiro." }, 400);
      }

      // Check balance first
      let currentBalance = 0;
      try {
        const balanceData = await asaasFetch(`/finance/balance`);
        currentBalance = balanceData?.balance ?? 0;
      } catch (e: any) {
        console.error("Balance check error:", e.message);
        return json({ error: "Erro ao verificar saldo disponível" }, 500);
      }

      if (amount > currentBalance) {
        return json({ error: `Saldo insuficiente. Disponível: R$ ${currentBalance.toFixed(2)}` }, 400);
      }

      // Create transfer via PIX
      const transferData: Record<string, unknown> = {
        value: amount,
        operationType: "PIX",
        description: "Saque ViuFoto",
      };

      // If PIX key provided, use it; otherwise Asaas uses the registered account
      if (pixKey) {
        transferData.pixAddressKey = pixKey;
        if (pixKeyType) transferData.pixAddressKeyType = pixKeyType; // CPF, EMAIL, PHONE, EVP
      }

      console.log(`Withdrawal request: R$${amount} for user ${user.id}`);
      
      try {
        const transfer = await asaasFetch("/transfers", {
          method: "POST",
          body: JSON.stringify(transferData),
        });

        console.log(`Withdrawal created: ${transfer.id} status: ${transfer.status}`);
        
        return json({
          success: true,
          transferId: transfer.id,
          status: transfer.status,
          amount: transfer.value,
          message: "Saque solicitado com sucesso! O valor será transferido em breve.",
        });
      } catch (e: any) {
        console.error("Withdrawal error:", e.message);
        return json({ error: e.message || "Erro ao processar saque" }, 500);
      }
    }

    // ─── GET TRANSFERS (HISTORY) ───
    if (action === "get_transfers") {
      const profile = await getProfile(supabaseAdmin, user.id);
      if (!profile?.asaas_wallet_id) {
        return json({ transfers: [], configured: false });
      }

      try {
        const data = await asaasFetch(`/transfers?limit=20`);
        const transfers = (data.data || []).map((t: any) => ({
          id: t.id,
          amount: t.value,
          status: t.status,
          date: t.dateCreated,
          type: t.operationType,
        }));
        return json({ transfers, configured: true });
      } catch (e: any) {
        console.error("Transfers fetch error:", e.message);
        return json({ transfers: [], configured: true, error: e.message });
      }
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (error: any) {
    console.error("Asaas Wallet Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
