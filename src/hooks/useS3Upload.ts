import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export function useS3Upload({ eventId, type, onProgress }: UploadOptions) {
  const queryClient = useQueryClient();
  const tableName = type === "fotos" ? "event_photos" : "event_videos";
  const queryKey = type === "fotos" ? "event-photos" : "event-videos";

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
      const objects = validFiles.map(f => ({
        path: `eventos/${eventId}/${type}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${f.name}`,
        file: f,
      }));

      const progressMap: UploadProgress[] = objects.map(o => ({
        fileName: o.file.name,
        progress: 0,
        status: "pending",
      }));
      onProgress?.(progressMap);

      // 2. Get presigned URLs
      let presigned;
      try {
        presigned = await getPresignedUrls(objects.map(o => ({ path: o.path })));
      } catch (err: any) {
        console.error("[S3Upload] Falha ao obter URLs assinadas:", err);
        progressMap.forEach((_, i) => {
          progressMap[i] = { ...progressMap[i], status: "error", errorDetail: "Falha ao gerar URL de upload" };
        });
        onProgress?.([...progressMap]);
        throw new Error("Falha ao gerar URLs de upload. Verifique sua conexão.");
      }

      // 3. Upload each file directly to S3
      const results = [];
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const signed = presigned[i];

        if (signed.error) {
          console.error(`[S3Upload] Presign error for ${obj.file.name}:`, signed.error);
          progressMap[i] = { ...progressMap[i], status: "error", progress: 0, errorDetail: "URL de upload inválida" };
          onProgress?.([...progressMap]);
          continue;
        }

        progressMap[i] = { ...progressMap[i], status: "uploading", progress: 10 };
        onProgress?.([...progressMap]);

        try {
          // Upload via XMLHttpRequest for real progress tracking
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(signed.method || "PUT", signed.url);
            xhr.setRequestHeader("Content-Type", obj.file.type);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 80) + 10; // 10-90%
                progressMap[i] = { ...progressMap[i], progress: pct };
                onProgress?.([...progressMap]);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                console.error(`[S3Upload] S3 PUT failed for ${obj.file.name}: status=${xhr.status}, response=${xhr.responseText?.slice(0, 200)}`);
                reject(new Error(`S3 retornou status ${xhr.status}`));
              }
            };

            xhr.onerror = () => {
              console.error(`[S3Upload] Network/CORS error for ${obj.file.name}. Verifique CORS do bucket S3.`);
              reject(new Error("Erro de rede ou CORS. Verifique configuração do bucket S3."));
            };

            xhr.ontimeout = () => {
              reject(new Error("Timeout no upload"));
            };

            xhr.timeout = 120000; // 2 min per file
            xhr.send(obj.file);
          });

          progressMap[i] = { ...progressMap[i], status: "uploading", progress: 90 };
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
