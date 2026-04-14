import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_BASE_URL = "https://sandbox.asaas.com/api/v3";

// Commission rates by plan type
const PLAN_COMMISSION: Record<string, number> = {
  inicio: 0.12,
  profissional: 0.10,
};

function getAsaasKey(): string {
  const key = Deno.env.get("ASAAS_API_KEY");
  if (!key) throw new Error("ASAAS_API_KEY not configured");
  return key;
}

function getViufotoWalletId(): string {
  const id = Deno.env.get("VIUFOTO_WALLET_ID");
  if (!id) throw new Error("VIUFOTO_WALLET_ID not configured");
  return id;
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

async function getOrCreateCustomer(name: string, email: string, cpfCnpj: string) {
  const existing = await asaasFetch(`/customers?cpfCnpj=${cpfCnpj}`);
  if (existing.data?.length > 0) {
    return existing.data[0];
  }
  return await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({ name, email, cpfCnpj }),
  });
}

async function createPixPaymentWithSplit(
  customerId: string,
  value: number,
  description: string,
  externalReference: string,
  split: Array<{ walletId: string; fixedValue?: number; percentualValue?: number; remainingValue?: boolean }>
) {
  const today = new Date().toISOString().split("T")[0];
  const body: Record<string, unknown> = {
    customer: customerId,
    billingType: "PIX",
    value,
    dueDate: today,
    description,
    externalReference,
  };
  if (split.length > 0) {
    body.split = split;
  }
  return await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function getPixQrCode(paymentId: string) {
  return await asaasFetch(`/payments/${paymentId}/pixQrCode`);
}

async function getPaymentStatus(paymentId: string) {
  return await asaasFetch(`/payments/${paymentId}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const supabaseAdmin = getSupabaseAdmin();

    if (action === "create_checkout") {
      const { name, email, cpfCnpj, eventId, items, total } = params;

      if (!name || !email || !cpfCnpj || !eventId || !items?.length || !total) {
        return new Response(JSON.stringify({ error: "Dados incompletos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1. Get event to determine plan_type and organizer
      const { data: event, error: eventError } = await supabaseAdmin
        .from("events")
        .select("organizer_id, plan_type")
        .eq("id", eventId)
        .single();

      if (eventError || !event) {
        throw new Error("Evento não encontrado");
      }

      // 2. Get photographer's wallet ID
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("asaas_wallet_id")
        .eq("user_id", event.organizer_id)
        .single();

      if (!profile?.asaas_wallet_id) {
        return new Response(JSON.stringify({
          error: "Este fotógrafo ainda não configurou recebimento. Entre em contato com o organizador do evento."
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Calculate split
      const commissionRate = PLAN_COMMISSION[event.plan_type] ?? 0.12;
      const platformFee = Math.round(total * commissionRate * 100) / 100;

      const viufotoWalletId = getViufotoWalletId();

      // If photographer wallet is the same as platform wallet, skip split
      // (ASAAS doesn't allow splitting to your own wallet)
      const isSameWallet = profile.asaas_wallet_id === viufotoWalletId;
      const split = isSameWallet
        ? []
        : [
            { walletId: viufotoWalletId, fixedValue: platformFee },
            { walletId: profile.asaas_wallet_id, remainingValue: true },
          ];

      console.log(`Split: platform=${platformFee} (${commissionRate * 100}%), photographer wallet=${profile.asaas_wallet_id}, total=${total}`);

      // 4. Create/find ASAAS customer
      const customer = await getOrCreateCustomer(name, email, cpfCnpj.replace(/\D/g, ""));

      // 5. Create order in database
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          event_id: eventId,
          client_name: name,
          client_email: email,
          client_cpf: cpfCnpj,
          amount: total,
          status: "aguardando_pagamento",
          payment_method: "pix",
        })
        .select()
        .single();

      if (orderError) throw new Error(`Order error: ${orderError.message}`);

      // 6. Create order items
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        photo_id: item.photoId || null,
        video_id: item.videoId || null,
        price: item.price,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw new Error(`Items error: ${itemsError.message}`);

      // 7. Create ASAAS PIX payment with split
      const payment = await createPixPaymentWithSplit(
        customer.id,
        total,
        `Compra de fotos - Evento ${eventId}`,
        order.id,
        split
      );

      // 8. Update order with ASAAS payment ID
      await supabaseAdmin
        .from("orders")
        .update({ asaas_payment_id: payment.id })
        .eq("id", order.id);

      // 9. Get PIX QR Code
      const pixData = await getPixQrCode(payment.id);

      return new Response(JSON.stringify({
        orderId: order.id,
        paymentId: payment.id,
        status: payment.status,
        pixQrCode: pixData.encodedImage,
        pixCopyPaste: pixData.payload,
        value: payment.value,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_status") {
      const { paymentId } = params;
      if (!paymentId) {
        return new Response(JSON.stringify({ error: "paymentId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const payment = await getPaymentStatus(paymentId);
      return new Response(JSON.stringify({
        status: payment.status,
        confirmedDate: payment.confirmedDate,
        value: payment.value,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("ASAAS Payment Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
