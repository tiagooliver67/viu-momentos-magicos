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

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    // Validate auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return json({ error: "Não autorizado" }, 401);

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // ─── CREATE WALLET ───
    if (action === "create_wallet") {
      const { name, email, cpfCnpj, phone, birthDate } = params;
      if (!name || !email || !cpfCnpj) return json({ error: "Nome, e-mail e CPF/CNPJ são obrigatórios" }, 400);

      const profile = await getProfile(supabaseAdmin, user.id);
      if (profile?.asaas_wallet_id) return json({ walletId: profile.asaas_wallet_id, message: "Carteira já configurada" });

      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, "");
      const accountData: Record<string, unknown> = {
        name, email, cpfCnpj: cleanCpfCnpj,
        companyType: cleanCpfCnpj.length > 11 ? "LIMITED" : "MEI",
        loginEmail: email,
        ...(phone ? { phone: phone.replace(/\D/g, "") } : {}),
        ...(birthDate ? { birthDate } : {}),
      };

      const account = await asaasFetch("/accounts", { method: "POST", body: JSON.stringify(accountData) });
      const walletId = account.walletId || account.id;
      if (!walletId) throw new Error("Falha ao obter walletId");

      await supabaseAdmin.from("profiles")
        .update({ asaas_wallet_id: walletId, full_name: name, cpf_cnpj: cpfCnpj, phone: phone || null })
        .eq("user_id", user.id);

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
      if (!profile?.asaas_wallet_id) return json({ balance: 0, pending: 0, configured: false });
      try {
        const balanceData = await asaasFetch(`/finance/balance`);
        return json({ balance: balanceData?.balance ?? 0, pending: balanceData?.statistics?.pending ?? 0, configured: true });
      } catch (e: any) {
        return json({ balance: 0, pending: 0, configured: true, error: e.message });
      }
    }

    // ─── ADD WITHDRAWAL ACCOUNT (whitelist) ───
    if (action === "add_withdrawal_account") {
      const { accountType, pixKey, pixKeyType, bankCode, bankName, agency, accountNumber, accountTypeBank, accountHolder, label } = params;

      const profile = await getProfile(supabaseAdmin, user.id);
      if (!profile?.cpf_cnpj) return json({ error: "Configure seus dados cadastrais antes de adicionar uma conta." }, 400);

      // Titularity validation: CPF/CNPJ on account must match profile
      // For PIX CPF type, validate match
      if (accountType === "pix" && pixKeyType === "CPF") {
        const cleanPixKey = pixKey?.replace(/\D/g, "") || "";
        const cleanProfileCpf = profile.cpf_cnpj.replace(/\D/g, "");
        if (cleanPixKey && cleanPixKey !== cleanProfileCpf) {
          return json({ error: "A chave PIX CPF deve corresponder ao seu CPF cadastrado. Saques só são permitidos para contas de mesma titularidade." }, 400);
        }
      }

      const insertData: Record<string, unknown> = {
        user_id: user.id,
        account_type: accountType || "pix",
        cpf_cnpj: profile.cpf_cnpj,
        status: "pending",
        label: label || null,
      };

      if (accountType === "pix") {
        if (!pixKey) return json({ error: "Informe a chave PIX" }, 400);
        insertData.pix_key = pixKey;
        insertData.pix_key_type = pixKeyType || "CPF";
      } else {
        if (!bankCode || !agency || !accountNumber) return json({ error: "Dados bancários incompletos" }, 400);
        insertData.bank_code = bankCode;
        insertData.bank_name = bankName;
        insertData.agency = agency;
        insertData.account_number = accountNumber;
        insertData.account_type_bank = accountTypeBank || "corrente";
        insertData.account_holder = accountHolder || profile.full_name;
      }

      const { data: newAccount, error: insertError } = await supabaseAdmin
        .from("withdrawal_accounts")
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

      // Create notification
      await supabaseAdmin.from("withdrawal_notifications").insert({
        user_id: user.id,
        notification_type: "account_added",
        message: `Nova conta de saque cadastrada (${accountType === "pix" ? "PIX" : "Conta bancária"}). Por segurança, saques serão liberados em 24 horas.`,
        metadata: { account_id: newAccount.id, ip: ipAddress },
      });

      return json({
        account: newAccount,
        message: "Conta cadastrada! Por segurança, saques serão liberados após 24 horas.",
        cooldownUntil: newAccount.activated_at,
      });
    }

    // ─── LIST WITHDRAWAL ACCOUNTS ───
    if (action === "list_withdrawal_accounts") {
      const { data } = await supabaseAdmin
        .from("withdrawal_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return json({ accounts: data || [] });
    }

    // ─── DELETE WITHDRAWAL ACCOUNT ───
    if (action === "delete_withdrawal_account") {
      const { accountId } = params;
      if (!accountId) return json({ error: "ID da conta é obrigatório" }, 400);

      const { error } = await supabaseAdmin
        .from("withdrawal_accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", user.id);

      if (error) throw new Error(error.message);

      await supabaseAdmin.from("withdrawal_notifications").insert({
        user_id: user.id,
        notification_type: "account_removed",
        message: "Uma conta de saque foi removida do seu cadastro.",
        metadata: { account_id: accountId, ip: ipAddress },
      });

      return json({ success: true, message: "Conta removida." });
    }

    // ─── REQUEST WITHDRAWAL (SECURE) ───
    if (action === "request_withdrawal") {
      const { accountId, amount, password } = params;

      if (!accountId) return json({ error: "Selecione uma conta cadastrada para saque." }, 400);
      if (!amount || amount <= 0) return json({ error: "Valor inválido para saque." }, 400);
      if (!password) return json({ error: "Confirme sua senha para realizar o saque." }, 400);

      // Verify password
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email!,
        password,
      });
      if (signInError) {
        // Log failed attempt
        await supabaseAdmin.from("withdrawal_logs").insert({
          user_id: user.id, account_id: accountId, amount, status: "blocked",
          ip_address: ipAddress, user_agent: userAgent,
          error_message: "Senha incorreta",
        });
        return json({ error: "Senha incorreta. Tente novamente." }, 400);
      }

      // Get the account from whitelist
      const { data: account } = await supabaseAdmin
        .from("withdrawal_accounts")
        .select("*")
        .eq("id", accountId)
        .eq("user_id", user.id)
        .single();

      if (!account) return json({ error: "Conta de saque não encontrada." }, 400);
      if (account.status === "blocked") return json({ error: "Esta conta está bloqueada." }, 400);

      // Check 24h cooldown
      if (account.status === "pending" || new Date(account.activated_at) > new Date()) {
        const activatedAt = new Date(account.activated_at);
        const hoursLeft = Math.ceil((activatedAt.getTime() - Date.now()) / (1000 * 60 * 60));
        return json({
          error: `Esta conta está em período de segurança. Saques serão liberados em ${hoursLeft > 0 ? hoursLeft : 1} hora(s).`,
        }, 400);
      }

      // Titularity check
      const profile = await getProfile(supabaseAdmin, user.id);
      if (!profile?.asaas_wallet_id) return json({ error: "Carteira não configurada." }, 400);

      const profileCpf = profile.cpf_cnpj?.replace(/\D/g, "") || "";
      const accountCpf = account.cpf_cnpj?.replace(/\D/g, "") || "";
      if (profileCpf !== accountCpf) {
        await supabaseAdmin.from("withdrawal_logs").insert({
          user_id: user.id, account_id: accountId, amount, status: "blocked",
          ip_address: ipAddress, user_agent: userAgent,
          error_message: "CPF/CNPJ da conta não corresponde ao perfil",
        });
        return json({ error: "CPF/CNPJ da conta de destino não corresponde ao seu cadastro." }, 400);
      }

      // Check balance
      let currentBalance = 0;
      try {
        const balanceData = await asaasFetch(`/finance/balance`);
        currentBalance = balanceData?.balance ?? 0;
      } catch {
        return json({ error: "Erro ao verificar saldo." }, 500);
      }
      if (amount > currentBalance) return json({ error: `Saldo insuficiente. Disponível: R$ ${currentBalance.toFixed(2)}` }, 400);

      // Log the request
      const { data: logEntry } = await supabaseAdmin.from("withdrawal_logs").insert({
        user_id: user.id, account_id: accountId, amount, status: "processing",
        ip_address: ipAddress, user_agent: userAgent,
      }).select().single();

      // Notification: withdrawal requested
      await supabaseAdmin.from("withdrawal_notifications").insert({
        user_id: user.id,
        notification_type: "withdrawal_requested",
        message: `Saque de R$ ${amount.toFixed(2)} solicitado. Caso não tenha sido você, entre em contato imediatamente.`,
        metadata: { amount, account_id: accountId, ip: ipAddress, log_id: logEntry?.id },
      });

      // Execute transfer via Asaas
      const transferData: Record<string, unknown> = {
        value: amount,
        operationType: "PIX",
        description: "Saque ViuFoto",
      };

      if (account.account_type === "pix" && account.pix_key) {
        transferData.pixAddressKey = account.pix_key;
        if (account.pix_key_type) transferData.pixAddressKeyType = account.pix_key_type;
      }

      try {
        const transfer = await asaasFetch("/transfers", { method: "POST", body: JSON.stringify(transferData) });

        // Update log
        if (logEntry) {
          await supabaseAdmin.from("withdrawal_logs")
            .update({ status: "completed", asaas_transfer_id: transfer.id, completed_at: new Date().toISOString() })
            .eq("id", logEntry.id);
        }

        // Activate account if still pending
        if (account.status === "pending") {
          await supabaseAdmin.from("withdrawal_accounts")
            .update({ status: "active" })
            .eq("id", account.id);
        }

        // Notification: completed
        await supabaseAdmin.from("withdrawal_notifications").insert({
          user_id: user.id,
          notification_type: "withdrawal_completed",
          message: `Saque de R$ ${amount.toFixed(2)} processado com sucesso!`,
          metadata: { amount, transfer_id: transfer.id },
        });

        return json({
          success: true, transferId: transfer.id, status: transfer.status, amount: transfer.value,
          message: "Saque processado com sucesso! O valor será transferido em breve.",
        });
      } catch (e: any) {
        if (logEntry) {
          await supabaseAdmin.from("withdrawal_logs")
            .update({ status: "failed", error_message: e.message })
            .eq("id", logEntry.id);
        }

        await supabaseAdmin.from("withdrawal_notifications").insert({
          user_id: user.id,
          notification_type: "withdrawal_failed",
          message: `Falha no saque de R$ ${amount.toFixed(2)}: ${e.message}`,
          metadata: { amount, error: e.message },
        });

        return json({ error: e.message || "Erro ao processar saque" }, 500);
      }
    }

    // ─── GET TRANSFERS (HISTORY via logs) ───
    if (action === "get_transfers") {
      const { data } = await supabaseAdmin
        .from("withdrawal_logs")
        .select("*, withdrawal_accounts(label, pix_key, pix_key_type, account_type)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      return json({ transfers: data || [] });
    }

    // ─── GET NOTIFICATIONS ───
    if (action === "get_notifications") {
      const { data } = await supabaseAdmin
        .from("withdrawal_notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      return json({ notifications: data || [] });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (error: any) {
    console.error("Asaas Wallet Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
