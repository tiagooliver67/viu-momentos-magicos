import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { STSClient, GetCallerIdentityCommand } from "npm:@aws-sdk/client-sts@3";
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  GetBucketLocationCommand,
  GetBucketPolicyCommand,
  GetBucketOwnershipControlsCommand,
  GetBucketAclCommand,
} from "npm:@aws-sdk/client-s3@3";
import { RekognitionClient, DetectTextCommand } from "npm:@aws-sdk/client-rekognition@3";
import {
  IAMClient,
  SimulatePrincipalPolicyCommand,
  ListAttachedUserPoliciesCommand,
  ListUserPoliciesCommand,
  ListGroupsForUserCommand,
  ListAttachedGroupPoliciesCommand,
  ListGroupPoliciesCommand,
  GetUserCommand,
} from "npm:@aws-sdk/client-iam@3";
import {
  OrganizationsClient,
  DescribeOrganizationCommand,
  ListPoliciesForTargetCommand,
} from "npm:@aws-sdk/client-organizations@3";

const AWS_REGION = Deno.env.get("AWS_REKOGNITION_REGION") || "sa-east-1";
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_REKOGNITION_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_REKOGNITION_SECRET_ACCESS_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEFAULT_BUCKET = "viufoto-images-bucket";
const DEFAULT_KEY = "usuarios/51b2e653-4d0a-4cd0-998a-89a3ab79fc7d/eventos/78d56cc0-96bc-4907-8b93-ef268e25cdf0/fotos/1780406967699-z8ba-dsc09009_2322380_276663.jpg";

const credentials = {
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
};

function serializeAwsError(error: unknown) {
  const anyE = error as any;
  return {
    name: anyE?.name ?? null,
    code: anyE?.Code ?? anyE?.code ?? null,
    message: anyE?.message ?? String(error),
    httpStatus: anyE?.$metadata?.httpStatusCode ?? null,
    requestId: anyE?.$metadata?.requestId ?? null,
    extendedRequestId: anyE?.$metadata?.extendedRequestId ?? null,
    cfId: anyE?.$metadata?.cfId ?? null,
    attempts: anyE?.$metadata?.attempts ?? null,
    totalRetryDelay: anyE?.$metadata?.totalRetryDelay ?? null,
    fault: anyE?.$fault ?? null,
    stack: anyE?.stack ?? null,
  };
}

async function runAndCapture<T>(op: () => Promise<T>) {
  try {
    return { ok: true, data: await op(), error: null };
  } catch (error) {
    return { ok: false, data: null, error: serializeAwsError(error) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    let isServiceRole = false;
    try {
      const payload = JSON.parse(atob(token.split(".")[1] || ""));
      if (payload?.role === "service_role") isServiceRole = true;
    } catch { /* ignore */ }

    if (!isServiceRole) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const bucket = typeof body?.bucket === "string" && body.bucket ? body.bucket : DEFAULT_BUCKET;
    const key = typeof body?.key === "string" && body.key ? body.key : DEFAULT_KEY;

    const keyId = AWS_ACCESS_KEY_ID || "";
    const keyPrefix = keyId.slice(0, 4);
    const keyMasked = keyId ? `${keyId.slice(0, 4)}...${keyId.slice(-4)}` : null;

    const sts = new STSClient({ region: AWS_REGION, credentials });
    const s3 = new S3Client({ region: AWS_REGION, credentials });
    const rekognition = new RekognitionClient({ region: AWS_REGION, credentials });
    const iam = new IAMClient({ region: "us-east-1", credentials });
    const orgs = new OrganizationsClient({ region: "us-east-1", credentials });

    const identityResult = await runAndCapture(async () => {
      const out = await sts.send(new GetCallerIdentityCommand({}));
      return {
        Account: out.Account ?? null,
        Arn: out.Arn ?? null,
        UserId: out.UserId ?? null,
        IAMUserName: out.Arn?.split("/").pop() || null,
      };
    });

    const bucketLocationResult = await runAndCapture(async () => {
      const out = await s3.send(new GetBucketLocationCommand({ Bucket: bucket }));
      return {
        bucket,
        locationConstraint: out.LocationConstraint ?? null,
        resolvedRegion: out.LocationConstraint || "us-east-1",
      };
    });

    const bucketPolicyResult = await runAndCapture(async () => {
      const out = await s3.send(new GetBucketPolicyCommand({ Bucket: bucket }));
      const policyText = out.Policy ?? null;
      let policyJson: any = null;
      let explicitDenyStatements: any[] = [];

      if (policyText) {
        try {
          policyJson = JSON.parse(policyText);
          const statements = Array.isArray(policyJson?.Statement)
            ? policyJson.Statement
            : policyJson?.Statement
              ? [policyJson.Statement]
              : [];
          explicitDenyStatements = statements.filter((statement: any) => statement?.Effect === "Deny");
        } catch {
          policyJson = { parseError: "Bucket policy is not valid JSON", raw: policyText };
        }
      }

      return {
        bucket,
        hasPolicy: !!policyText,
        explicitDenyFound: explicitDenyStatements.length > 0,
        explicitDenyStatements,
        policy: policyJson,
      };
    });

    const ownershipControlsResult = await runAndCapture(async () => {
      const out = await s3.send(new GetBucketOwnershipControlsCommand({ Bucket: bucket }));
      return {
        bucket,
        rules: out.OwnershipControls?.Rules ?? [],
      };
    });

    const bucketAclResult = await runAndCapture(async () => {
      const out = await s3.send(new GetBucketAclCommand({ Bucket: bucket }));
      return {
        bucket,
        owner: out.Owner ?? null,
        grants: (out.Grants ?? []).map((grant) => ({
          permission: grant.Permission ?? null,
          type: grant.Grantee?.Type ?? null,
          uri: grant.Grantee?.URI ?? null,
          id: grant.Grantee?.ID ?? null,
          displayName: grant.Grantee?.DisplayName ?? null,
        })),
      };
    });

    const headObjectResult = await runAndCapture(async () => {
      const out = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return {
        bucket,
        key,
        httpStatus: out.$metadata.httpStatusCode ?? null,
        contentLength: out.ContentLength ?? null,
        contentType: out.ContentType ?? null,
        eTag: out.ETag ?? null,
        lastModified: out.LastModified?.toISOString?.() ?? null,
        serverSideEncryption: out.ServerSideEncryption ?? null,
        metadata: out.Metadata ?? {},
      };
    });

    const getObjectResult = await runAndCapture(async () => {
      const out = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-0" }));
      if (out.Body) {
        const stream = out.Body.transformToByteArray
          ? await out.Body.transformToByteArray()
          : new Uint8Array();
        return {
          bucket,
          key,
          httpStatus: out.$metadata.httpStatusCode ?? null,
          contentLength: out.ContentLength ?? null,
          contentRange: out.ContentRange ?? null,
          contentType: out.ContentType ?? null,
          acceptRanges: out.AcceptRanges ?? null,
          bodyBytesRead: stream.length,
          serverSideEncryption: out.ServerSideEncryption ?? null,
        };
      }

      return {
        bucket,
        key,
        httpStatus: out.$metadata.httpStatusCode ?? null,
        contentLength: out.ContentLength ?? null,
        contentRange: out.ContentRange ?? null,
        contentType: out.ContentType ?? null,
        acceptRanges: out.AcceptRanges ?? null,
        bodyBytesRead: 0,
        serverSideEncryption: out.ServerSideEncryption ?? null,
      };
    });

    // TEST 1: DetectText using S3Object reference
    const rekognitionS3ObjectResult = await runAndCapture(async () => {
      const out = await rekognition.send(new DetectTextCommand({
        Image: { S3Object: { Bucket: bucket, Name: key } },
      }));
      return {
        mode: "S3Object",
        bucket,
        key,
        httpStatus: out.$metadata.httpStatusCode ?? null,
        requestId: out.$metadata.requestId ?? null,
        extendedRequestId: out.$metadata.extendedRequestId ?? null,
        attempts: out.$metadata.attempts ?? null,
        textDetectionsCount: out.TextDetections?.length ?? 0,
        textDetectionsSample: (out.TextDetections ?? []).slice(0, 10).map((t) => ({
          DetectedText: t.DetectedText,
          Type: t.Type,
          Id: t.Id,
          Confidence: t.Confidence,
        })),
      };
    });

    // TEST 2: DetectText using Bytes (download via GetObject then send buffer)
    const rekognitionBytesResult = await runAndCapture(async () => {
      const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!obj.Body) throw new Error("S3 GetObject returned empty body");
      const bytes = await (obj.Body as any).transformToByteArray();

      // Note: Rekognition Bytes hard limit is 5MB. We send anyway to capture
      // the real exception type — this isolates auth vs. size errors.
      const out = await rekognition.send(new DetectTextCommand({
        Image: { Bytes: bytes },
      }));
      return {
        mode: "Bytes",
        bucket,
        key,
        downloadedBytes: bytes.length,
        httpStatus: out.$metadata.httpStatusCode ?? null,
        requestId: out.$metadata.requestId ?? null,
        extendedRequestId: out.$metadata.extendedRequestId ?? null,
        attempts: out.$metadata.attempts ?? null,
        textDetectionsCount: out.TextDetections?.length ?? 0,
        textDetectionsSample: (out.TextDetections ?? []).slice(0, 10).map((t) => ({
          DetectedText: t.DetectedText,
          Type: t.Type,
          Id: t.Id,
          Confidence: t.Confidence,
        })),
      };
    });

    const userName = "viufoto-s3-user";

    const iamGetUserResult = await runAndCapture(async () => {
      const out = await iam.send(new GetUserCommand({ UserName: userName }));
      return {
        UserName: out.User?.UserName ?? null,
        Arn: out.User?.Arn ?? null,
        UserId: out.User?.UserId ?? null,
        CreateDate: out.User?.CreateDate?.toISOString?.() ?? null,
        PermissionsBoundary: out.User?.PermissionsBoundary ?? null,
        Tags: out.User?.Tags ?? [],
      };
    });

    const attachedUserPoliciesResult = await runAndCapture(async () => {
      const out = await iam.send(new ListAttachedUserPoliciesCommand({ UserName: userName }));
      return out.AttachedPolicies ?? [];
    });

    const inlineUserPoliciesResult = await runAndCapture(async () => {
      const out = await iam.send(new ListUserPoliciesCommand({ UserName: userName }));
      return out.PolicyNames ?? [];
    });

    const groupsResult = await runAndCapture(async () => {
      const out = await iam.send(new ListGroupsForUserCommand({ UserName: userName }));
      const groups = out.Groups ?? [];
      const enriched = await Promise.all(groups.map(async (g) => {
        const attached = await iam.send(new ListAttachedGroupPoliciesCommand({ GroupName: g.GroupName! })).catch((e) => ({ error: serializeAwsError(e) }));
        const inline = await iam.send(new ListGroupPoliciesCommand({ GroupName: g.GroupName! })).catch((e) => ({ error: serializeAwsError(e) }));
        return {
          GroupName: g.GroupName,
          Arn: g.Arn,
          AttachedPolicies: (attached as any).AttachedPolicies ?? (attached as any).error ?? [],
          InlinePolicies: (inline as any).PolicyNames ?? (inline as any).error ?? [],
        };
      }));
      return enriched;
    });

    const userArn = `arn:aws:iam::987292390239:user/${userName}`;

    const simulateDetectTextResult = await runAndCapture(async () => {
      const out = await iam.send(new SimulatePrincipalPolicyCommand({
        PolicySourceArn: userArn,
        ActionNames: ["rekognition:DetectText"],
      }));
      const results = (out.EvaluationResults ?? []).map((r) => ({
        EvalActionName: r.EvalActionName,
        EvalResourceName: r.EvalResourceName,
        EvalDecision: r.EvalDecision,
        MatchedStatements: r.MatchedStatements ?? [],
        MissingContextValues: r.MissingContextValues ?? [],
        OrganizationsDecisionDetail: r.OrganizationsDecisionDetail ?? null,
        PermissionsBoundaryDecisionDetail: r.PermissionsBoundaryDecisionDetail ?? null,
        EvalDecisionDetails: r.EvalDecisionDetails ?? null,
        ResourceSpecificResults: r.ResourceSpecificResults ?? [],
      }));
      return { EvaluationResults: results, IsTruncated: out.IsTruncated ?? false };
    });

    const simulateMultiResult = await runAndCapture(async () => {
      const out = await iam.send(new SimulatePrincipalPolicyCommand({
        PolicySourceArn: userArn,
        ActionNames: [
          "rekognition:DetectText",
          "rekognition:DetectLabels",
          "rekognition:DetectFaces",
          "s3:GetObject",
        ],
        ResourceArns: [
          `arn:aws:s3:::viufoto-images-bucket/${key}`,
        ],
      }));
      return (out.EvaluationResults ?? []).map((r) => ({
        EvalActionName: r.EvalActionName,
        EvalDecision: r.EvalDecision,
        MatchedStatementsCount: (r.MatchedStatements ?? []).length,
        OrganizationsDecisionDetail: r.OrganizationsDecisionDetail ?? null,
        PermissionsBoundaryDecisionDetail: r.PermissionsBoundaryDecisionDetail ?? null,
      }));
    });

    const organizationsResult = await runAndCapture(async () => {
      const out = await orgs.send(new DescribeOrganizationCommand({}));
      return {
        Id: out.Organization?.Id ?? null,
        MasterAccountId: out.Organization?.MasterAccountId ?? null,
        FeatureSet: out.Organization?.FeatureSet ?? null,
        AvailablePolicyTypes: out.Organization?.AvailablePolicyTypes ?? [],
      };
    });

    const scpResult = await runAndCapture(async () => {
      const out = await orgs.send(new ListPoliciesForTargetCommand({
        TargetId: "987292390239",
        Filter: "SERVICE_CONTROL_POLICY",
      }));
      return out.Policies ?? [];
    });

    return new Response(JSON.stringify({
      ok: true,
      configuredRegion: AWS_REGION,
      accessKeyIdPrefix: keyPrefix,
      accessKeyIdMasked: keyMasked,
      accessKeyIdLength: keyId.length,
      target: { bucket, key },
      identity: identityResult,
      bucketLocation: bucketLocationResult,
      bucketPolicy: bucketPolicyResult,
      ownershipControls: ownershipControlsResult,
      bucketAcl: bucketAclResult,
      headObject: headObjectResult,
      getObject: getObjectResult,
      rekognitionS3Object: rekognitionS3ObjectResult,
      rekognitionBytes: rekognitionBytesResult,
      iam: {
        getUser: iamGetUserResult,
        attachedUserPolicies: attachedUserPoliciesResult,
        inlineUserPolicies: inlineUserPoliciesResult,
        groups: groupsResult,
        simulateDetectText: simulateDetectTextResult,
        simulateMulti: simulateMultiResult,
      },
      organizations: {
        describe: organizationsResult,
        scpForAccount: scpResult,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});