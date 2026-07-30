import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { toDbLayers, type WatermarkLayer, type WatermarkLayerDb } from "@/lib/watermarkLayers";
import { DEFAULT_PRESET_ID, getPreset } from "@/lib/watermarkPresets";

export interface AccountWatermarkSettings {
  active_kind: "preset" | "template";
  active_preset_id: string | null;
  active_template_id: string | null;
  layers: WatermarkLayerDb[];
}

/**
 * Modelo de marca d'água ATIVO da conta (único, vale para todos os eventos).
 * As camadas ficam materializadas aqui (copiar, não referenciar) para que o
 * processamento no servidor resolva a marca pelo organizer_id do evento,
 * sem que nenhum fotógrafo convidado precise ler dados de outra conta.
 */
export function useAccountWatermark() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["account-watermark", user?.id],
    queryFn: async (): Promise<AccountWatermarkSettings | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("account_watermark_settings" as any)
        .select("active_kind, active_preset_id, active_template_id, layers")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as any;
      return {
        active_kind: row.active_kind,
        active_preset_id: row.active_preset_id,
        active_template_id: row.active_template_id,
        layers: (row.layers || []) as WatermarkLayerDb[],
      };
    },
    enabled: !!user?.id,
  });

  const setActive = useMutation({
    mutationFn: async (input: {
      kind: "preset" | "template";
      presetId?: string | null;
      templateId?: string | null;
      layers: WatermarkLayer[];
    }) => {
      if (!user?.id) throw new Error("Não autenticado");
      if (!input.layers.length) throw new Error("Este modelo não possui camadas.");
      const { error } = await supabase
        .from("account_watermark_settings" as any)
        .upsert(
          {
            user_id: user.id,
            active_kind: input.kind,
            active_preset_id: input.kind === "preset" ? input.presetId ?? null : null,
            active_template_id: input.kind === "template" ? input.templateId ?? null : null,
            layers: toDbLayers(input.layers) as any,
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-watermark"] });
    },
    onError: (err: any) =>
      toast.error("Não foi possível aplicar a marca d'água: " + (err?.message ?? "erro desconhecido")),
  });

  // Conta nova: já nasce com um preset do sistema pré-selecionado.
  const needsInit = !!user?.id && settingsQuery.isSuccess && settingsQuery.data === null;
  useEffect(() => {
    if (!needsInit || setActive.isPending) return;
    const preset = getPreset(DEFAULT_PRESET_ID);
    setActive.mutate({ kind: "preset", presetId: preset.id, layers: preset.layers });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsInit]);

  const settings = settingsQuery.data;

  return {
    settings,
    isLoading: settingsQuery.isLoading,
    activeKind: settings?.active_kind ?? "preset",
    activePresetId: settings?.active_kind === "preset" ? settings.active_preset_id ?? DEFAULT_PRESET_ID : null,
    activeTemplateId: settings?.active_kind === "template" ? settings.active_template_id : null,
    setActive,
  };
}
