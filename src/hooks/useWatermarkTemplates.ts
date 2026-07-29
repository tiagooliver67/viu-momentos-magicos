import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { WatermarkLayer, WatermarkTemplate } from "@/lib/watermarkLayers";

export function useWatermarkTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["watermark-templates", user?.id],
    queryFn: async (): Promise<WatermarkTemplate[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("watermark_templates" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any[]) || []).map(t => ({
        id: t.id,
        name: t.name,
        layers: (t.layers || []) as WatermarkLayer[],
        created_at: t.created_at,
      }));
    },
    enabled: !!user?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async ({ name, layers }: { name: string; layers: WatermarkLayer[] }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("watermark_templates" as any)
        .insert({ user_id: user.id, name, layers: layers as any })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watermark-templates"] });
      toast.success("Marca d'água criada!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("watermark_templates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watermark-templates"] });
      toast.success("Marca d'água removida.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    createTemplate,
    deleteTemplate,
  };
}
