import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { STSClient, GetCallerIdentityCommand } from "npm:@aws-sdk/client-sts@3";
import { SQSClient, GetQueueAttributesCommand, GetQueueUrlCommand } from "npm:@aws-sdk/client-sqs@3";

const AWS_REGION = Deno.env.get("AWS_REKOGNITION_REGION") || "sa-east-1";
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_REKOGNITION_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_REKOGNITION_SECRET_ACCESS_KEY")!;
const DLQ_NAME = Deno.env.get("SQS_BIB_DLQ_NAME") || "viufoto-bib-dlq";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const credentials = { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only super_admins can view infra status
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: claims.claims.sub,
      _role: "super_admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sts = new STSClient({ region: AWS_REGION, credentials });
    const sqs = new SQSClient({ region: AWS_REGION, credentials });

    const [identity, urlResp] = await Promise.all([
      sts.send(new GetCallerIdentityCommand({})),
      sqs.send(new GetQueueUrlCommand({ QueueName: DLQ_NAME })),
    ]);

    const queueUrl = urlResp.QueueUrl!;
    const attrs = await sqs.send(new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: [
        "ApproximateNumberOfMessages",
        "ApproximateNumberOfMessagesNotVisible",
        "ApproximateNumberOfMessagesDelayed",
        "LastModifiedTimestamp",
      ],
    }));

    const a = attrs.Attributes || {};
    return new Response(JSON.stringify({
      ok: true,
      queue: {
        name: DLQ_NAME,
        region: AWS_REGION,
        account: identity.Account,
        url: queueUrl,
      },
      messages: {
        available: Number(a.ApproximateNumberOfMessages || 0),
        in_flight: Number(a.ApproximateNumberOfMessagesNotVisible || 0),
        delayed: Number(a.ApproximateNumberOfMessagesDelayed || 0),
      },
      last_modified: a.LastModifiedTimestamp ? new Date(Number(a.LastModifiedTimestamp) * 1000).toISOString() : null,
      checked_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const anyE = e as any;
    return new Response(JSON.stringify({
      ok: false,
      error: anyE?.message || String(e),
      code: anyE?.name || anyE?.Code || null,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});