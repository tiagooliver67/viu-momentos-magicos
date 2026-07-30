import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  fromDbLayers, toDbLayers,
  type WatermarkLayer, type WatermarkTemplate,
} from "@/lib/watermarkLayers";

/** Marcas d'água configuradas por evento (watermark_configs). */
export function useEventWatermarkConfigs(eventId?: string) {
  const queryClient = useQueryClient();

  const configsQuery = useQuery({
    queryKey: ["watermark-configs", eventId],
    queryFn: async (): Promise<WatermarkTemplate[]> => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from("watermark_configs" as any)
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any[]) || []).map(c => ({
        id: c.id,
        name: c.name,
        layers: fromDbLayers(c.layers),
        created_at: c.created_at,
      }));
    },
    enabled: !!eventId,
  });

  const createConfig = useMutation({
    mutationFn: async ({ name, layers }: { name: string; layers: WatermarkLayer[] }) => {
      if (!eventId) throw new Error("Evento não encontrado");
      const dbLayers = toDbLayers(layers);
      if (!dbLayers.some(l => l.image_url)) {
        throw new Error("Envie a imagem de pelo menos uma camada antes de salvar.");
      }
      const { data, error } = await supabase
        .from("watermark_configs" as any)
        .insert({ event_id: eventId, name, layers: dbLayers as any })
        .select()
        .single();
      if (error) {
        console.error("[watermark_configs] insert falhou", error);
        throw new Error(
          [error.message, error.details, error.hint].filter(Boolean).join(" — ") ||
            "Falha desconhecida ao salvar a marca d'água."
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watermark-configs", eventId] });
      toast.success("Marca d'água criada para este evento!");
    },
    onError: (err: any) => toast.error("Erro ao salvar marca d'água: " + (err?.message || "falha desconhecida")),
  });

  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("watermark_configs" as any).delete().eq("id", id);
      if (error) {
        console.error("[watermark_configs] delete falhou", error);
        throw new Error([error.message, error.details, error.hint].filter(Boolean).join(" — "));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watermark-configs", eventId] });
      toast.success("Marca d'água removida.");
    },
    onError: (err: any) => toast.error("Erro ao remover: " + (err?.message || "falha desconhecida")),
  });

  return {
    configs: configsQuery.data || [],
    isLoading: configsQuery.isLoading,
    createConfig,
    deleteConfig,
  };
}