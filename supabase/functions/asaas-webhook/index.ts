import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("ASAAS Webhook received:", JSON.stringify(body));

    const { event, payment } = body;

    if (!event || !payment) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Handle payment confirmation events
    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      const asaasPaymentId = payment.id;
      const externalReference = payment.externalReference; // our order ID

      if (!externalReference) {
        console.log("No externalReference found, skipping");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update order status to "pago"
      const { error } = await supabaseAdmin
        .from("orders")
        .update({
          status: "pago",
          asaas_payment_id: asaasPaymentId,
        })
        .eq("id", externalReference);

      if (error) {
        console.error("Error updating order:", error);
      } else {
        console.log(`Order ${externalReference} marked as paid`);
      }
    }

    // Handle other events
    if (event === "PAYMENT_OVERDUE" || event === "PAYMENT_DELETED") {
      const externalReference = payment.externalReference;
      if (externalReference) {
        await supabaseAdmin
          .from("orders")
          .update({ status: "cancelado" })
          .eq("id", externalReference);
        console.log(`Order ${externalReference} cancelled`);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
