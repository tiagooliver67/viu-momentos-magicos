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

    if (action === "create_wallet") {
      const { name, email, cpfCnpj, phone } = params;

      if (!name || !email || !cpfCnpj) {
        return new Response(JSON.stringify({ error: "Nome, e-mail e CPF/CNPJ são obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already has a wallet
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("asaas_wallet_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.asaas_wallet_id) {
        return new Response(JSON.stringify({ 
          walletId: profile.asaas_wallet_id,
          message: "Carteira já configurada" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create Asaas subaccount (which gives us a walletId)
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

      if (!walletId) {
        throw new Error("Falha ao obter walletId da subconta Asaas");
      }

      // Save wallet ID to profile
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          asaas_wallet_id: walletId,
          full_name: name,
          cpf_cnpj: cpfCnpj,
          phone: phone || null,
        })
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(`Erro ao salvar dados: ${updateError.message}`);
      }

      console.log(`Wallet created: ${walletId} for user ${user.id}`);

      return new Response(JSON.stringify({
        walletId,
        message: "Recebimento configurado com sucesso!",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_wallet") {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("asaas_wallet_id, full_name, cpf_cnpj, phone")
        .eq("user_id", user.id)
        .single();

      return new Response(JSON.stringify({
        configured: !!profile?.asaas_wallet_id,
        walletId: profile?.asaas_wallet_id || null,
        name: profile?.full_name || null,
        cpfCnpj: profile?.cpf_cnpj || null,
        phone: profile?.phone || null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Asaas Wallet Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
