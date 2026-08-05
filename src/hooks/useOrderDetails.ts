import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useOrderDetails(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order-details", orderId],
    queryFn: async () => {
      if (!orderId) throw new Error("No order ID");
      
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select(`
          *,
          event_photos (
            thumbnail_url
          ),
          event_videos (
            thumbnail_url
          )
        `)
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      return { ...order, items };
    },
    enabled: !!orderId,
  });
}
