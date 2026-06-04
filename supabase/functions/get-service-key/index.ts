// TEMPORARY — DELETE AFTER USE
// Returns SUPABASE_SERVICE_ROLE_KEY when called with the correct x-temp-pass header.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const TEMP_PASS = "34303bee195bdfd4a3d8f33b0f9118c29efbe427f786937a";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const pass = req.headers.get("x-temp-pass");
  if (pass !== TEMP_PASS) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});