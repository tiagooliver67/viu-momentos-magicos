import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  RekognitionClient,
  CreateCollectionCommand,
  DeleteCollectionCommand,
  DescribeCollectionCommand,
} from "npm:@aws-sdk/client-rekognition@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REK_REGION = Deno.env.get("AWS_REKOGNITION_REGION") || "us-east-1";
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_REKOGNITION_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_REKOGNITION_SECRET_ACCESS_KEY")!;

const rek = new RekognitionClient({
  region: REK_REGION,
  credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
});

const log = (level: "info" | "warn" | "error", payload: Record<string, unknown>) => {
  console.log(JSON.stringify({ level, fn: "face-collection-manager", ts: new Date().toISOString(), ...payload }));
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { action, event_id } = body as { action?: "ensure" | "delete" | "describe"; event_id?: string };
    if (!action || !event_id) return jsonResponse({ error: "action and event_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Autorização: super_admin OU organizador OU fotógrafo do evento
    const [{ data: roleRow }, { data: ev }, { data: photogRow }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle(),
      admin.from("events").select("id, organizer_id, face_search_enabled").eq("id", event_id).maybeSingle(),
      admin.from("event_photographers").select("photographer_id").eq("event_id", event_id).eq("photographer_id", user.id).maybeSingle(),
    ]);
    if (!ev) return jsonResponse({ error: "Event not found" }, 404);
    const isAuthorized = !!roleRow || ev.organizer_id === user.id || !!photogRow;
    if (!isAuthorized) return jsonResponse({ error: "Forbidden" }, 403);

    if (action === "ensure") {
      // 1) Reserva atômica no banco
      const { data: rpcRows, error: rpcErr } = await admin.rpc("ensure_face_collection", { _event_id: event_id });
      if (rpcErr) throw rpcErr;
      const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
      const collection_id = row?.collection_id as string;
      const created_now = !!row?.created;

      // 2) Cria de fato no AWS se foi a primeira reserva (idempotente — trata ResourceAlreadyExists)
      if (created_now) {
        try {
          await rek.send(new CreateCollectionCommand({ CollectionId: collection_id }));
          log("info", { event_id, collection_id, msg: "collection_created" });
        } catch (e) {
          const name = (e as any)?.name || "";
          if (name === "ResourceAlreadyExistsException") {
            log("info", { event_id, collection_id, msg: "collection_already_existed_on_aws" });
          } else {
            // Reverte para permitir nova tentativa
            await admin.from("event_face_collections").update({ status: "error" }).eq("event_id", event_id);
            log("error", { event_id, collection_id, name, err: (e as Error).message });
            throw e;
          }
        }
      }

      return jsonResponse({ ok: true, collection_id, created: created_now });
    }

    if (action === "delete") {
      const { data: row } = await admin.from("event_face_collections").select("collection_id").eq("event_id", event_id).maybeSingle();
      const collection_id = row?.collection_id ?? `event_${event_id.replace(/-/g, "")}`;
      await admin.from("event_face_collections").update({ status: "deleting" }).eq("event_id", event_id);
      try {
        await rek.send(new DeleteCollectionCommand({ CollectionId: collection_id }));
      } catch (e) {
        const name = (e as any)?.name || "";
        if (name !== "ResourceNotFoundException") {
          log("error", { event_id, collection_id, name, err: (e as Error).message });
          throw e;
        }
      }
      await admin.from("event_photo_faces").delete().eq("event_id", event_id);
      await admin.from("event_face_collections").update({ status: "deleted", faces_indexed: 0 }).eq("event_id", event_id);
      log("info", { event_id, collection_id, msg: "collection_deleted" });
      return jsonResponse({ ok: true, collection_id, deleted: true });
    }

    if (action === "describe") {
      const { data: row } = await admin.from("event_face_collections").select("*").eq("event_id", event_id).maybeSingle();
      if (!row) return jsonResponse({ ok: true, exists: false });
      let aws_face_count: number | null = null;
      try {
        const out = await rek.send(new DescribeCollectionCommand({ CollectionId: row.collection_id }));
        aws_face_count = out.FaceCount ?? null;
      } catch (_e) {
        // tolerável — apenas describe falhou
      }
      return jsonResponse({ ok: true, exists: true, ...row, aws_face_count });
    }

    return jsonResponse({ error: "unknown action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("error", { err: msg });
    return jsonResponse({ error: msg }, 500);
  }
});