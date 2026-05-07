import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CheckoutItem {
  photoId?: string;
  videoId?: string;
  price: number;
}

interface PixData {
  orderId: string;
  paymentId: string;
  status: string;
  pixQrCode: string; // base64 image
  pixCopyPaste: string;
  value: number;
}

export function useAsaasCheckout() {
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create checkout and get PIX QR code
  const createCheckout = async (params: {
    name: string;
    email: string;
    cpfCnpj: string;
    eventId: string;
    items: CheckoutItem[];
    total: number;
  }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("asaas-payment", {
        body: { action: "create_checkout", ...params },
      });
      if (error) {
        // Try to extract friendly message from edge function response body
        let friendly: string | null = null;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            friendly = body?.error ?? null;
          } else if (ctx && typeof ctx.text === "function") {
            const txt = await ctx.text();
            try { friendly = JSON.parse(txt)?.error ?? null; } catch { /* noop */ }
          }
        } catch { /* noop */ }
        throw new Error(friendly || "Não foi possível concluir o pagamento. Tente novamente em instantes.");
      }
      if (data?.error) throw new Error(data.error);
      setPixData(data);
      setPaymentStatus(data.status);
      // Start polling for payment status
      startPolling(data.paymentId);
      return data;
    } catch (err: any) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Poll payment status every 5 seconds
  const startPolling = (paymentId: string) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("asaas-payment", {
          body: { action: "check_status", paymentId },
        });
        if (data?.status) {
          setPaymentStatus(data.status);
          if (data.status === "RECEIVED" || data.status === "CONFIRMED") {
            stopPolling();
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const reset = () => {
    stopPolling();
    setPixData(null);
    setPaymentStatus(null);
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const isPaid = paymentStatus === "RECEIVED" || paymentStatus === "CONFIRMED";

  return { createCheckout, loading, pixData, paymentStatus, isPaid, reset };
}
