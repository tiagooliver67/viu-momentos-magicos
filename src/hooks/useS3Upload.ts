import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resizeImageWithWatermark } from "@/lib/imageResize";
import { IS_LAMBDA_PIPELINE_ACTIVE } from "@/lib/cdnConfig";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  errorDetail?: string;
}

interface UploadOptions {
  eventId: string;
  type: "fotos" | "videos";
  /** Watermark PNG URL to bake into preview images */
  watermarkUrl?: string;
  onProgress?: (files: UploadProgress[]) => void;
}

const DEFAULT_WATERMARK = "/watermark-default.png";

async function getPresignedUrls(objects: { path: string }[]) {
  const { data, error } = await supabase.functions.invoke("s3-presign", {
    body: { action: "sign_upload_batch", objects },
  });
  if (error) throw new Error(error.message);
  return data.results as { path: string; url: string; expires_in: number; method: string; error?: string }[];
}

export async function getSignedReadUrl(objectPath: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("s3-presign", {
    body: { action: "sign_read", object_path: objectPath },
  });
  if (error) throw new Error(error.message);
  return data.url;
}

export async function getSignedReadUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.functions.invoke("s3-presign", {
    body: { action: "sign_read_batch", objects: paths.map(p => ({ path: p })) },
  });
  if (error) throw new Error(error.message);
  const map: Record<string, string> = {};
  for (const r of data.results) {
    if (r.url) map[r.path] = r.url;
  }
  return map;
}

/** Convert an original S3 path to its thumbnail variant */
export function toThumbPath(originalPath: string): string {
  const lastSlash = originalPath.lastIndexOf("/");
  if (lastSlash === -1) return originalPath;
  const dir = originalPath.substring(0, lastSlash);
  const filename = originalPath.substring(lastSlash + 1).replace(/\.[^.]+$/, ".jpg");
  return `${dir}/thumb/${filename}`;
}

/** Convert an original S3 path to its medium variant */
export function toMediumPath(originalPath: string): string {
  const lastSlash = originalPath.lastIndexOf("/");
  if (lastSlash === -1) return originalPath;
  const dir = originalPath.substring(0, lastSlash);
  const filename = originalPath.substring(lastSlash + 1).replace(/\.[^.]+$/, ".jpg");
  return `${dir}/medium/${filename}`;
}

function uploadBlob(url: string, blob: Blob, method: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader("Content-Type", blob.type || "image/jpeg");
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`S3 PUT status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.timeout = 30000;
    xhr.ontimeout = () => reject(new Error("Timeout"));
    xhr.send(blob);
  });
}

export function useS3Upload({ eventId, type, watermarkUrl, onProgress }: UploadOptions) {
  const queryClient = useQueryClient();
  const tableName = type === "fotos" ? "event_photos" : "event_videos";
  const queryKey = type === "fotos" ? "event-photos" : "event-videos";
  const isPhoto = type === "fotos";

  return useMutation({
    mutationFn: async (files: File[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const MAX_SIZE = 30 * 1024 * 1024;
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      for (const f of files) {
        if (f.size > MAX_SIZE) {
          invalidFiles.push(`${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`);
        } else {
          validFiles.push(f);
        }
      }
      if (invalidFiles.length > 0) {
        toast.error(`Arquivos acima de 30MB: ${invalidFiles.join(", ")}`);
      }
      if (validFiles.length === 0) throw new Error("Nenhum arquivo válido");

      // Generate S3 paths
      const objects = validFiles.map(f => {
        const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        return { path: `eventos/${eventId}/${type}/${uid}-${f.name}`, file: f, uid };
      });

      const progressMap: UploadProgress[] = objects.map(o => ({
        fileName: o.file.name,
        progress: 0,
        status: "pending",
      }));
      onProgress?.(progressMap);

      // Build all paths for presigned URLs
      // When Lambda is active, it generates thumb/medium — only upload originals
      const allPaths: { path: string }[] = [];
      for (const obj of objects) {
        allPaths.push({ path: obj.path }); // original
        if (isPhoto && !IS_LAMBDA_PIPELINE_ACTIVE) {
          allPaths.push({ path: toThumbPath(obj.path) });   // thumb with watermark
          allPaths.push({ path: toMediumPath(obj.path) });  // medium with watermark
        }
      }

      let presigned: { path: string; url: string; method: string; error?: string }[];
      try {
        presigned = await getPresignedUrls(allPaths);
      } catch (err: any) {
        console.error("[S3Upload] Falha ao obter URLs assinadas:", err);
        progressMap.forEach((_, i) => {
          progressMap[i] = { ...progressMap[i], status: "error", errorDetail: "Falha ao gerar URL de upload" };
        });
        onProgress?.([...progressMap]);
        throw new Error("Falha ao gerar URLs de upload.");
      }

      const signedMap = new Map<string, { url: string; method: string }>();
      for (const s of presigned) {
        if (!s.error && s.url) signedMap.set(s.path, { url: s.url, method: s.method });
      }

      // Watermark source for baking
      const wmSrc = watermarkUrl || DEFAULT_WATERMARK;

      const results = [];
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const signed = signedMap.get(obj.path);

        if (!signed) {
          progressMap[i] = { ...progressMap[i], status: "error", progress: 0, errorDetail: "URL de upload inválida" };
          onProgress?.([...progressMap]);
          continue;
        }

        progressMap[i] = { ...progressMap[i], status: "uploading", progress: 5 };
        onProgress?.([...progressMap]);

        try {
          // Generate WATERMARKED thumbnails — only when Lambda pipeline is NOT active
          let thumbBlob: Blob | null = null;
          let mediumBlob: Blob | null = null;

          if (isPhoto && !IS_LAMBDA_PIPELINE_ACTIVE) {
            try {
              [thumbBlob, mediumBlob] = await Promise.all([
                resizeImageWithWatermark(obj.file, 400, wmSrc, 0.75),
                resizeImageWithWatermark(obj.file, 1200, wmSrc, 0.82),
              ]);
            } catch (resizeErr) {
              console.warn("[S3Upload] Resize with watermark failed:", resizeErr);
            }
          }

          progressMap[i] = { ...progressMap[i], progress: 20 };
          onProgress?.([...progressMap]);

          // Upload ORIGINAL (clean, no watermark) — protected, only accessible post-purchase
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(signed.method || "PUT", signed.url);
            xhr.setRequestHeader("Content-Type", obj.file.type);
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 50) + 20;
                progressMap[i] = { ...progressMap[i], progress: pct };
                onProgress?.([...progressMap]);
              }
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`S3 status ${xhr.status}`));
            };
            xhr.onerror = () => reject(new Error("Erro de rede ou CORS"));
            xhr.ontimeout = () => reject(new Error("Timeout"));
            xhr.timeout = 120000;
            xhr.send(obj.file);
          });

          progressMap[i] = { ...progressMap[i], progress: 75 };
          onProgress?.([...progressMap]);

          // Upload watermarked thumb and medium in parallel (only when not using Lambda)
          if (isPhoto && !IS_LAMBDA_PIPELINE_ACTIVE) {
            const thumbUploads: Promise<void>[] = [];
            if (thumbBlob) {
              const ts = signedMap.get(toThumbPath(obj.path));
              if (ts) thumbUploads.push(uploadBlob(ts.url, thumbBlob, ts.method || "PUT"));
            }
            if (mediumBlob) {
              const ms = signedMap.get(toMediumPath(obj.path));
              if (ms) thumbUploads.push(uploadBlob(ms.url, mediumBlob, ms.method || "PUT"));
            }
            await Promise.allSettled(thumbUploads);
          }

          progressMap[i] = { ...progressMap[i], progress: 90 };
          onProgress?.([...progressMap]);

          // Save to database (stores ORIGINAL path — thumb/medium derived from it)
          const insertData: any = {
            event_id: eventId,
            photographer_id: user.id,
            file_url: obj.path,
            file_name: obj.file.name,
          };

          const { data, error } = await supabase
            .from(tableName)
            .insert(insertData)
            .select()
            .single();

          if (error) {
            console.error(`[S3Upload] DB insert error for ${obj.file.name}:`, error);
            progressMap[i] = { ...progressMap[i], status: "error", progress: 0, errorDetail: "Erro ao salvar no banco" };
            onProgress?.([...progressMap]);
            continue;
          }

          progressMap[i] = { ...progressMap[i], status: "done", progress: 100 };
          onProgress?.([...progressMap]);
          results.push(data);
        } catch (err: any) {
          progressMap[i] = { ...progressMap[i], status: "error", progress: 0, errorDetail: err.message };
          onProgress?.([...progressMap]);
          console.error(`[S3Upload] Upload error for ${obj.file.name}:`, err);
        }
      }

      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [queryKey, eventId] });
      if (data.length > 0) {
        toast.success(`${data.length} ${type === "fotos" ? "foto(s)" : "vídeo(s)"} enviado(s) com sucesso!`);
      }
    },
    onError: (e) => toast.error("Erro no upload: " + e.message),
  });
}
