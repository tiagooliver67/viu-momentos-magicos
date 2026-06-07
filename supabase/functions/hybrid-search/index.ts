import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  RekognitionClient,
  SearchFacesByImageCommand,
  DetectFacesCommand,
} from "npm:@aws-sdk/client-rekognition@3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const REK_REGION = Deno.env.get("AWS_REKOGNITION_REGION") || "us-east-1";
const AWS_ACCESS_KEY_ID = Deno.env.get("AWS_REKOGNITION_ACCESS_KEY_ID")!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get("AWS_REKOGNITION_SECRET_ACCESS_KEY")!;

const rek = new RekognitionClient({
  region: REK_REGION,
  credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
});

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Simple in-memory rate limit (per edge isolate). 10 requests / 60s / ip+event.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBucket = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (rateBucket.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    rateBucket.set(key, arr);
    return true;
  }
  arr.push(now);
  rateBucket.set(key, arr);
  return false;
}

const log = (level: "info" | "warn" | "error", payload: Record<string, unknown>) => {
  console.log(JSON.stringify({ level, fn: "hybrid-search", ts: new Date().toISOString(), ...payload }));
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = performance.now();
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid JSON" }, 400);

    const {
      event_id,
      selfie_base64,
      bib_number,
      similarity_threshold = 80,
      max_results = 60,
    } = body as {
      event_id?: string;
      selfie_base64?: string;
      bib_number?: string;
      similarity_threshold?: number;
      max_results?: number;
    };

    if (!event_id || typeof event_id !== "string") {
      return json({ error: "event_id é obrigatório" }, 400);
    }
    if (!selfie_base64 && !bib_number) {
      return json({ error: "Forneça selfie_base64 ou bib_number" }, 400);
    }

    // Auth (opcional) — capturamos user_id apenas para logging
    let user_id: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data } = await userClient.auth.getUser();
        user_id = data?.user?.id ?? null;
      } catch { /* ignore */ }
    }

    // Rate limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (rateLimited(`${ip}:${event_id}`)) {
      log("warn", { event_id, ip, msg: "rate_limited" });
      return json({ error: "Muitas buscas em pouco tempo. Aguarde alguns segundos." }, 429);
    }

    // Verifica evento + face_search_enabled
    const { data: ev, error: evErr } = await admin
      .from("events")
      .select("id, visibility, face_search_enabled, bib_search_enabled, face_index_mode")
      .eq("id", event_id)
      .maybeSingle();
    if (evErr || !ev) return json({ error: "Evento não encontrado" }, 404);
    if (!ev.visibility) return json({ error: "Evento indisponível" }, 403);

    const result: {
      matches: Array<{
        photo_id: string;
        similarity: number;
        rank: number;
        source: "face" | "bib";
      }>;
      face_search: { enabled: boolean; matches: number; best_similarity: number | null };
      bib_search: { enabled: boolean; matches: number };
      duration_ms: number;
    } = {
      matches: [],
      face_search: { enabled: false, matches: 0, best_similarity: null },
      bib_search: { enabled: false, matches: 0 },
      duration_ms: 0,
    };

    const matchMap = new Map<string, { photo_id: string; similarity: number; source: "face" | "bib" }>();

    // ===== FACIAL =====
    let selfieQuality: Record<string, unknown> | null = null;
    let bestSim: number | null = null;
    let simSum = 0;
    let simCount = 0;

    if (selfie_base64 && ev.face_search_enabled !== false) {
      result.face_search.enabled = true;
      const bytes = b64ToBytes(selfie_base64);
      if (bytes.length > 5_000_000) {
        return json({ error: "Selfie excede 5MB" }, 400);
      }

      // Ensure collection exists
      const { data: ensured, error: ensErr } = await admin.rpc("ensure_face_collection", { _event_id: event_id });
      if (ensErr || !ensured || ensured.length === 0) {
        log("error", { event_id, msg: "ensure_collection_failed", err: ensErr?.message });
        return json({ error: "Falha ao preparar busca facial" }, 500);
      }
      const collectionId = ensured[0].collection_id as string;

      // Quality check (não bloqueia, apenas registra)
      try {
        const detect = await rek.send(new DetectFacesCommand({
          Image: { Bytes: bytes },
          Attributes: ["DEFAULT"],
        }));
        const f = detect.FaceDetails?.[0];
        if (f) selfieQuality = { confidence: f.Confidence, quality: f.Quality, pose: f.Pose };
        if (!detect.FaceDetails || detect.FaceDetails.length === 0) {
          return json({ error: "Nenhum rosto detectado na selfie. Use uma foto de rosto bem iluminada." }, 400);
        }
      } catch (e) {
        log("warn", { event_id, msg: "detect_faces_failed", err: (e as Error).message });
      }

      try {
        const search = await rek.send(new SearchFacesByImageCommand({
          CollectionId: collectionId,
          Image: { Bytes: bytes },
          FaceMatchThreshold: similarity_threshold,
          MaxFaces: Math.min(max_results, 100),
          QualityFilter: "AUTO",
        }));

        const faceIds = (search.FaceMatches || []).map((m) => m.Face?.FaceId).filter(Boolean) as string[];
        if (faceIds.length > 0) {
          const { data: faces } = await admin
            .from("event_photo_faces")
            .select("photo_id, rekognition_face_id")
            .eq("event_id", event_id)
            .in("rekognition_face_id", faceIds);

          const faceIdToPhoto = new Map<string, string>();
          for (const f of faces || []) faceIdToPhoto.set(f.rekognition_face_id, f.photo_id);

          for (const m of search.FaceMatches || []) {
            const fid = m.Face?.FaceId;
            const sim = m.Similarity ?? 0;
            if (!fid) continue;
            const photoId = faceIdToPhoto.get(fid);
            if (!photoId) continue;
            const existing = matchMap.get(photoId);
            if (!existing || sim > existing.similarity) {
              matchMap.set(photoId, { photo_id: photoId, similarity: sim, source: "face" });
            }
            if (bestSim === null || sim > bestSim) bestSim = sim;
            simSum += sim;
            simCount += 1;
          }
        }
        result.face_search.matches = matchMap.size;
        result.face_search.best_similarity = bestSim;
      } catch (e) {
        const name = (e as { name?: string }).name || "RekognitionError";
        log("error", { event_id, msg: "search_failed", code: name, err: (e as Error).message });
        if (name === "ResourceNotFoundException") {
          // collection ainda não existe ou foi removida — sem matches
        } else if (name === "InvalidParameterException") {
          return json({ error: "Selfie inválida ou sem rosto reconhecível" }, 400);
        } else {
          return json({ error: "Falha na busca facial. Tente novamente." }, 500);
        }
      }
    }

    // ===== BIB (OCR) =====
    if (bib_number && typeof bib_number === "string" && ev.bib_search_enabled !== false) {
      result.bib_search.enabled = true;
      const num = bib_number.trim();
      if (/^\d{1,6}$/.test(num)) {
        const { data: bibs } = await admin
          .from("photo_bib_numbers")
          .select("photo_id")
          .eq("event_id", event_id)
          .eq("number", num);
        for (const b of bibs || []) {
          if (!matchMap.has(b.photo_id)) {
            matchMap.set(b.photo_id, { photo_id: b.photo_id, similarity: 100, source: "bib" });
          }
        }
        result.bib_search.matches = bibs?.length || 0;
      }
    }

    // Ordena por similarity DESC
    const sorted = Array.from(matchMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, max_results)
      .map((m, i) => ({ ...m, rank: i + 1 }));
    result.matches = sorted;
    result.duration_ms = Math.round(performance.now() - t0);

    // ===== LOG estruturado + persistência =====
    if (result.face_search.enabled) {
      try {
        const { data: logRow } = await admin
          .from("face_search_logs")
          .insert({
            event_id,
            user_id,
            matches_count: result.face_search.matches,
            best_similarity: bestSim,
            avg_similarity: simCount > 0 ? simSum / simCount : null,
            duration_ms: result.duration_ms,
            selfie_quality: selfieQuality,
            ip_address: ip,
            user_agent: req.headers.get("user-agent"),
          })
          .select("id")
          .single();

        if (logRow?.id && sorted.length > 0) {
          const matchesRows = sorted
            .filter((m) => m.source === "face")
            .map((m) => ({
              search_log_id: logRow.id,
              event_id,
              photo_id: m.photo_id,
              similarity: m.similarity,
              rank: m.rank,
            }));
          if (matchesRows.length > 0) {
            await admin.from("face_search_matches").insert(matchesRows);
          }
        }
      } catch (e) {
        log("warn", { event_id, msg: "log_persist_failed", err: (e as Error).message });
      }
    }

    log("info", {
      event_id,
      user_id,
      matches: sorted.length,
      face_matches: result.face_search.matches,
      bib_matches: result.bib_search.matches,
      best_similarity: bestSim,
      duration_ms: result.duration_ms,
    });

    return json(result);
  } catch (e) {
    log("error", { msg: "unhandled", err: (e as Error).message });
    return json({ error: "Erro inesperado" }, 500);
  }
});
