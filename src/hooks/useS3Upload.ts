import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resizeImage } from "@/lib/imageResize";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  errorDetail?: string;
}

interface UploadOptions {
  eventId: string;
  type: "fotos" | "videos";
  onProgress?: (files: UploadProgress[]) => void;
}

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
  // eventos/{eventId}/fotos/filename → eventos/{eventId}/fotos/thumb/filename
  const lastSlash = originalPath.lastIndexOf("/");
  if (lastSlash === -1) return originalPath;
  const dir = originalPath.substring(0, lastSlash);
  const filename = originalPath.substring(lastSlash + 1);
  // Replace extension with .jpg since thumbnails are always JPEG
  const baseName = filename.replace(/\.[^.]+$/, ".jpg");
  return `${dir}/thumb/${baseName}`;
}

/** Convert an original S3 path to its medium variant */
export function toMediumPath(originalPath: string): string {
  const lastSlash = originalPath.lastIndexOf("/");
  if (lastSlash === -1) return originalPath;
  const dir = originalPath.substring(0, lastSlash);
  const filename = originalPath.substring(lastSlash + 1);
  const baseName = filename.replace(/\.[^.]+$/, ".jpg");
  return `${dir}/medium/${baseName}`;
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

export function useS3Upload({ eventId, type, onProgress }: UploadOptions) {
  const queryClient = useQueryClient();
  const tableName = type === "fotos" ? "event_photos" : "event_videos";
  const queryKey = type === "fotos" ? "event-photos" : "event-videos";
  const isPhoto = type === "fotos";

  return useMutation({
    mutationFn: async (files: File[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Validate files
      const MAX_SIZE = 30 * 1024 * 1024; // 30MB
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

      // 1. Generate S3 paths
      const objects = validFiles.map(f => {
        const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const originalPath = `eventos/${eventId}/${type}/${uid}-${f.name}`;
        return { path: originalPath, file: f, uid };
      });

      const progressMap: UploadProgress[] = objects.map(o => ({
        fileName: o.file.name,
        progress: 0,
        status: "pending",
      }));
      onProgress?.(progressMap);

      // 2. Build all paths we need presigned URLs for (original + thumb + medium for photos)
      const allPaths: { path: string }[] = [];
      for (const obj of objects) {
        allPaths.push({ path: obj.path });
        if (isPhoto) {
          allPaths.push({ path: toThumbPath(obj.path) });
          allPaths.push({ path: toMediumPath(obj.path) });
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
        throw new Error("Falha ao gerar URLs de upload. Verifique sua conexão.");
      }

      // Build a map path→signed for easy lookup
      const signedMap = new Map<string, { url: string; method: string }>();
      for (const s of presigned) {
        if (!s.error && s.url) signedMap.set(s.path, { url: s.url, method: s.method });
      }

      // 3. Upload each file
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
          // Generate thumbnails for photos (in parallel with nothing — they're fast)
          let thumbBlob: Blob | null = null;
          let mediumBlob: Blob | null = null;

          if (isPhoto) {
            try {
              [thumbBlob, mediumBlob] = await Promise.all([
                resizeImage(obj.file, 400, 0.75),
                resizeImage(obj.file, 1200, 0.82),
              ]);
            } catch (resizeErr) {
              console.warn("[S3Upload] Resize failed, uploading original only:", resizeErr);
            }
          }

          progressMap[i] = { ...progressMap[i], progress: 15 };
          onProgress?.([...progressMap]);

          // Upload original via XHR with progress
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(signed.method || "PUT", signed.url);
            xhr.setRequestHeader("Content-Type", obj.file.type);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 55) + 15; // 15-70%
                progressMap[i] = { ...progressMap[i], progress: pct };
                onProgress?.([...progressMap]);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) resolve();
              else reject(new Error(`S3 status ${xhr.status}`));
            };
            xhr.onerror = () => reject(new Error("Erro de rede ou CORS"));
            xhr.ontimeout = () => reject(new Error("Timeout no upload"));
            xhr.timeout = 120000;
            xhr.send(obj.file);
          });

          progressMap[i] = { ...progressMap[i], progress: 75 };
          onProgress?.([...progressMap]);

          // Upload thumb and medium in parallel (fire-and-forget errors — originals are safe)
          if (isPhoto) {
            const thumbUploads: Promise<void>[] = [];
            if (thumbBlob) {
              const thumbSigned = signedMap.get(toThumbPath(obj.path));
              if (thumbSigned) {
                thumbUploads.push(uploadBlob(thumbSigned.url, thumbBlob, thumbSigned.method || "PUT"));
              }
            }
            if (mediumBlob) {
              const medSigned = signedMap.get(toMediumPath(obj.path));
              if (medSigned) {
                thumbUploads.push(uploadBlob(medSigned.url, mediumBlob, medSigned.method || "PUT"));
              }
            }
            // Don't fail the whole upload if thumbnails fail
            await Promise.allSettled(thumbUploads);
          }

          progressMap[i] = { ...progressMap[i], progress: 90 };
          onProgress?.([...progressMap]);

          // 4. Save to database
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
