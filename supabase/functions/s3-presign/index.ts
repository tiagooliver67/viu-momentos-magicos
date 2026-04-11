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
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const AWS_S3_API_KEY = Deno.env.get("AWS_S3_API_KEY");
  if (!AWS_S3_API_KEY) {
    return new Response(JSON.stringify({ error: "AWS_S3_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { action, object_path, objects } = body;

    // Read actions (sign_read, sign_read_batch) can work without auth for public gallery
    const isReadAction = action === "sign_read" || action === "sign_read_batch";

    // Write actions require authentication
    if (!isReadAction) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "sign_upload") {
      if (!object_path) {
        return new Response(JSON.stringify({ error: "object_path required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const signRes = await fetch(
        `${GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=write`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": AWS_S3_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ object_path }),
        }
      );

      if (!signRes.ok) {
        const errText = await signRes.text();
        throw new Error(`Sign upload error [${signRes.status}]: ${errText}`);
      }

      const data = await signRes.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sign_upload_batch") {
      if (!objects || !Array.isArray(objects)) {
        return new Response(JSON.stringify({ error: "objects array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const obj of objects) {
        const signRes = await fetch(
          `${GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=write`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": AWS_S3_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ object_path: obj.path }),
          }
        );

        if (!signRes.ok) {
          const errText = await signRes.text();
          results.push({ path: obj.path, error: errText });
        } else {
          const data = await signRes.json();
          results.push({ path: obj.path, ...data });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sign_read") {
      if (!object_path) {
        return new Response(JSON.stringify({ error: "object_path required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const signRes = await fetch(
        `${GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=read`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": AWS_S3_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ object_path }),
        }
      );

      if (!signRes.ok) {
        const errText = await signRes.text();
        throw new Error(`Sign read error [${signRes.status}]: ${errText}`);
      }

      const data = await signRes.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sign_read_batch") {
      if (!objects || !Array.isArray(objects)) {
        return new Response(JSON.stringify({ error: "objects array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const obj of objects) {
        const signRes = await fetch(
          `${GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=read`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": AWS_S3_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ object_path: obj.path }),
          }
        );

        if (!signRes.ok) {
          results.push({ path: obj.path, error: "failed" });
        } else {
          const data = await signRes.json();
          results.push({ path: obj.path, ...data });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      return new Response(JSON.stringify({ success: true, message: "DB record will be deleted by client" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: sign_upload, sign_upload_batch, sign_read, sign_read_batch" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("s3-presign error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
