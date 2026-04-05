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

// Create or find customer in ASAAS
async function getOrCreateCustomer(name: string, email: string, cpfCnpj: string) {
  // Check if customer already exists by cpfCnpj
  const existing = await asaasFetch(`/customers?cpfCnpj=${cpfCnpj}`);
  if (existing.data?.length > 0) {
    return existing.data[0];
  }
  // Create new customer
  return await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({ name, email, cpfCnpj }),
  });
}

// Create PIX payment
async function createPixPayment(customerId: string, value: number, description: string, externalReference: string) {
  const today = new Date().toISOString().split("T")[0];
  return await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value,
      dueDate: today,
      description,
      externalReference,
    }),
  });
}

// Get PIX QR Code
async function getPixQrCode(paymentId: string) {
  return await asaasFetch(`/payments/${paymentId}/pixQrCode`);
}

// Get payment status
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

      // 1. Create/find ASAAS customer
      const customer = await getOrCreateCustomer(name, email, cpfCnpj.replace(/\D/g, ""));

      // 2. Create order in database
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

      // 3. Create order items
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

      // 4. Create ASAAS PIX payment
      const payment = await createPixPayment(
        customer.id,
        total,
        `Compra de fotos - Evento ${eventId}`,
        order.id
      );

      // 5. Update order with ASAAS payment ID
      await supabaseAdmin
        .from("orders")
        .update({ asaas_payment_id: payment.id })
        .eq("id", order.id);

      // 6. Get PIX QR Code
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
