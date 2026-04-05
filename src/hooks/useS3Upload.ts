import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
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

      // 1. Generate S3 paths
      const objects = files.map(f => ({
        path: `eventos/${eventId}/${type}/${Date.now()}-${f.name}`,
        file: f,
      }));

      const progressMap: UploadProgress[] = objects.map(o => ({
        fileName: o.file.name,
        progress: 0,
        status: "pending",
      }));
      onProgress?.(progressMap);

      // 2. Get presigned URLs
      const presigned = await getPresignedUrls(objects.map(o => ({ path: o.path })));

      // 3. Upload each file directly to S3
      const results = [];
      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const signed = presigned[i];

        if (signed.error) {
          progressMap[i] = { ...progressMap[i], status: "error", progress: 0 };
          onProgress?.([...progressMap]);
          continue;
        }

        progressMap[i] = { ...progressMap[i], status: "uploading", progress: 10 };
        onProgress?.([...progressMap]);

        try {
          // Direct PUT to S3 presigned URL
          const uploadRes = await fetch(signed.url, {
            method: signed.method || "PUT",
            body: obj.file,
            headers: {
              "Content-Type": obj.file.type,
            },
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed: ${uploadRes.status}`);
          }

          progressMap[i] = { ...progressMap[i], status: "uploading", progress: 80 };
          onProgress?.([...progressMap]);

          // 4. Save to database with S3 path (not a public URL)
          const insertData: any = {
            event_id: eventId,
            photographer_id: user.id,
            file_url: obj.path, // Store S3 object path
            file_name: obj.file.name,
          };

          const { data, error } = await supabase
            .from(tableName)
            .insert(insertData)
            .select()
            .single();

          if (error) throw error;

          progressMap[i] = { ...progressMap[i], status: "done", progress: 100 };
          onProgress?.([...progressMap]);
          results.push(data);
        } catch (err: any) {
          progressMap[i] = { ...progressMap[i], status: "error", progress: 0 };
          onProgress?.([...progressMap]);
          console.error(`Upload error for ${obj.file.name}:`, err);
        }
      }

      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [queryKey, eventId] });
      if (data.length > 0) {
        toast.success(`${data.length} ${type === "fotos" ? "foto(s)" : "vídeo(s)"} enviado(s) para o S3!`);
      }
    },
    onError: (e) => toast.error("Erro no upload: " + e.message),
  });
}
