import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Colunas legíveis pelo dono do site. Campos sensíveis (cnpj, assinatura interna
// da bio IA) não são expostos via API — apenas server-side.
const SITE_COLUMNS = [
  "id", "user_id", "slug", "display_name", "bio", "avatar_url", "banner_url",
  "watermark_url", "watermark_position", "watermark_opacity", "watermark_size",
  "template", "primary_color", "secondary_color", "whatsapp", "instagram",
  "facebook", "tiktok", "youtube", "linkedin", "twitter", "seo_title",
  "seo_keywords", "allow_custom_links", "ai_bio", "ai_bio_generated_at",
  "created_at", "updated_at", "blur_protection_enabled", "blur_protection_pattern",
  "blur_protection_devices", "contact_email", "contact_phone", "referral_code",
].join(", ");

export function usePhotographerSite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const siteQuery = useQuery({
    queryKey: ["photographer-site", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("photographer_sites")
        .select(SITE_COLUMNS)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  const upsertSite = useMutation({
    mutationFn: async (updates: any) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("photographer_sites")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("photographer_sites")
          .update(updates)
          .eq("user_id", user.id)
          .select(SITE_COLUMNS)
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("photographer_sites")
          .insert({ user_id: user.id, ...updates })
          .select(SITE_COLUMNS)
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photographer-site"] });
      toast.success("Site atualizado com sucesso!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadAsset = async (file: File, path: string) => {
    if (!user?.id) throw new Error("Not authenticated");
    const filePath = `${user.id}/${path}`;
    const { error } = await supabase.storage
      .from("photographer-assets")
      .upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from("photographer-assets")
      .getPublicUrl(filePath);
    return publicUrl;
  };

  return { site: siteQuery.data, isLoading: siteQuery.isLoading, upsertSite, uploadAsset };
}

export function usePhotographerSiteBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["photographer-site-public", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("photographer_sites_public" as any)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!slug,
  });
}

export function useCustomLinks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const linksQuery = useQuery({
    queryKey: ["custom-links", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("custom_links")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const addLink = useMutation({
    mutationFn: async ({ label, url }: { label: string; url: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("custom_links")
        .insert({ user_id: user.id, label, url });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-links"] });
      toast.success("Link adicionado!");
    },
  });

  const removeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-links"] });
      toast.success("Link removido!");
    },
  });

  return { links: linksQuery.data || [], addLink, removeLink };
}
