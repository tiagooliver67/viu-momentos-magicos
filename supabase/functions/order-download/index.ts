import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const AWS_S3_API_KEY = Deno.env.get("AWS_S3_API_KEY");

  if (!LOVABLE_API_KEY || !AWS_S3_API_KEY) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action, order_id, email, token } = body;

    // Action: lookup orders by email
    if (action === "lookup") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: orders, error } = await supabaseAdmin
        .from("orders")
        .select(`
          id, client_name, client_email, amount, status, payment_method, created_at, event_id,
          order_items ( id, photo_id, video_id, price )
        `)
        .eq("client_email", email.toLowerCase().trim())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch event names for each order
      const eventIds = [...new Set((orders || []).map(o => o.event_id))];
      let eventMap: Record<string, string> = {};
      if (eventIds.length > 0) {
        const { data: events } = await supabaseAdmin
          .from("events")
          .select("id, name")
          .in("id", eventIds);
        if (events) {
          eventMap = Object.fromEntries(events.map(e => [e.id, e.name]));
        }
      }

      const enriched = (orders || []).map(o => ({
        ...o,
        event_name: eventMap[o.event_id] || "Evento",
        item_count: o.order_items?.length || 0,
      }));

      return new Response(JSON.stringify({ orders: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: download - generate signed URLs for a paid order
    if (action === "download") {
      if (!order_id || !email) {
        return new Response(JSON.stringify({ error: "order_id e email são obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate order belongs to email and is paid
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .select("id, status, client_email, event_id")
        .eq("id", order_id)
        .single();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.client_email.toLowerCase() !== email.toLowerCase().trim()) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (order.status !== "pago" && order.status !== "enviado") {
        return new Response(JSON.stringify({ error: "Pedido ainda não foi pago" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get order items with photo/video paths
      const { data: items, error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .select("id, photo_id, video_id, price, resolution")
        .eq("order_id", order_id);

      if (itemsErr) throw itemsErr;

      // Map photo_id -> resolution (high = original, low = medium/social)
      const photoResolution = new Map<string, "high" | "low">();
      (items || []).forEach(i => {
        if (i.photo_id) {
          photoResolution.set(i.photo_id, (i.resolution === "low" ? "low" : "high"));
        }
      });

      const photoIds = Array.from(photoResolution.keys());
      const videoIds = (items || []).filter(i => i.video_id).map(i => i.video_id!);

      // Fetch file paths from event_photos and event_videos
      let photos: { id: string; file_url: string; file_name: string | null }[] = [];
      let videos: { id: string; file_url: string; file_name: string | null }[] = [];

      if (photoIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("event_photos")
          .select("id, file_url, file_name")
          .in("id", photoIds);
        photos = data || [];
      }

      if (videoIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("event_videos")
          .select("id, file_url, file_name")
          .in("id", videoIds);
        videos = data || [];
      }

      // Resolve the actual S3 path based on the purchased resolution.
      // - high  -> /original/  (no watermark, full resolution)
      // - low   -> /medium/    (1200px, light watermark — "Foto Social")
      // The Lambda pipeline writes processed variants under
      //   {dir}/medium/{filename}.jpg  and keeps the original at the original path.
      const resolvePhotoPath = (originalPath: string, resolution: "high" | "low") => {
        if (resolution === "high") return originalPath;
        const lastSlash = originalPath.lastIndexOf("/");
        if (lastSlash === -1) return originalPath;
        const dir = originalPath.substring(0, lastSlash);
        const filename = originalPath.substring(lastSlash + 1).replace(/\.[^.]+$/, ".jpg");
        return `${dir}/medium/${filename}`;
      };

      // Generate signed read URLs for all files (24h expiration)
      const allFiles = [
        ...photos.map(p => {
          const res = photoResolution.get(p.id) ?? "high";
          return {
            id: p.id,
            path: resolvePhotoPath(p.file_url, res),
            name: p.file_name,
            type: "photo",
            resolution: res,
          };
        }),
        ...videos.map(v => ({ id: v.id, path: v.file_url, name: v.file_name, type: "video" })),
      ];

      const signedFiles = [];
      for (const file of allFiles) {
        // Skip legacy Supabase URLs
        if (file.path.startsWith("http")) {
          signedFiles.push({ ...file, url: file.path });
          continue;
        }

        try {
          const signRes = await fetch(
            `${GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=read`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": AWS_S3_API_KEY,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ object_path: file.path }),
            }
          );

          if (signRes.ok) {
            const { url } = await signRes.json();
            signedFiles.push({ ...file, url });
          } else {
            signedFiles.push({ ...file, url: null, error: "Falha ao gerar URL" });
          }
        } catch {
          signedFiles.push({ ...file, url: null, error: "Erro interno" });
        }
      }

      // Update order status to "enviado" if it was "pago"
      if (order.status === "pago") {
        await supabaseAdmin
          .from("orders")
          .update({ status: "enviado" })
          .eq("id", order_id);
      }

      return new Response(JSON.stringify({ files: signedFiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use: lookup, download" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("order-download error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
