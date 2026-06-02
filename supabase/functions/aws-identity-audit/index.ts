import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { STSClient, GetCallerIdentityCommand } from "npm:@aws-sdk/client-sts@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AWS_REGION = Deno.env.get("AWS_REKOGNITION_REGION") || "sa-east-1";
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_REKOGNITION_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_REKOGNITION_SECRET_ACCESS_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const keyId = AWS_ACCESS_KEY_ID || "";
    const keyPrefix = keyId.slice(0, 4);
    const keyMasked = keyId ? `${keyId.slice(0, 4)}...${keyId.slice(-4)}` : null;
    const keyLength = keyId.length;
    const secretPresent = !!AWS_SECRET_ACCESS_KEY;
    const secretLength = AWS_SECRET_ACCESS_KEY?.length || 0;

    const sts = new STSClient({
      region: AWS_REGION,
      credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    });

    let identity: any = null;
    let identityError: any = null;
    try {
      const out = await sts.send(new GetCallerIdentityCommand({}));
      identity = {
        Account: out.Account,
        Arn: out.Arn,
        UserId: out.UserId,
        IAMUserName: out.Arn?.split("/").pop() || null,
      };
    } catch (e) {
      const anyE = e as any;
      identityError = {
        name: anyE?.name,
        message: anyE?.message,
        httpStatus: anyE?.$metadata?.httpStatusCode,
        fault: anyE?.$fault,
        code: anyE?.Code,
      };
    }

    return new Response(JSON.stringify({
      ok: true,
      region: AWS_REGION,
      access_key_id_prefix: keyPrefix,
      access_key_id_masked: keyMasked,
      access_key_id_length: keyLength,
      secret_present: secretPresent,
      secret_length: secretLength,
      identity,
      identity_error: identityError,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});