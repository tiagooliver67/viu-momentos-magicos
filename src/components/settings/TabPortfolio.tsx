import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Plus, Star, Trash2, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const DEFAULT_CATEGORIES = ["Corrida", "Ciclismo", "Triathlon", "Trail Run"];

type Category = { id: string; name: string; sort_order: number };
type Photo = { id: string; category_id: string | null; image_url: string; is_featured: boolean };

const TabPortfolio = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Categories
  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["portfolio-categories", user?.id],
    queryFn: async (): Promise<Category[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("portfolio_categories")
        .select("id, name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Seed default categories the first time
  useEffect(() => {
    if (!user?.id || loadingCats) return;
    if (categories.length === 0) {
      (async () => {
        const rows = DEFAULT_CATEGORIES.map((name, i) => ({ user_id: user.id, name, sort_order: i }));
        await supabase.from("portfolio_categories").insert(rows);
        qc.invalidateQueries({ queryKey: ["portfolio-categories"] });
      })();
    }
  }, [user?.id, loadingCats, categories.length, qc]);

  useEffect(() => {
    if (!selectedCatId && categories.length) setSelectedCatId(categories[0].id);
  }, [categories, selectedCatId]);

  // Photos
  const { data: photos = [] } = useQuery({
    queryKey: ["portfolio-photos", user?.id, selectedCatId],
    queryFn: async (): Promise<Photo[]> => {
      if (!user?.id || !selectedCatId) return [];
      const { data, error } = await supabase
        .from("portfolio_photos")
        .select("id, category_id, image_url, is_featured")
        .eq("user_id", user.id)
        .eq("category_id", selectedCatId)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!selectedCatId,
  });

  // Mutations
  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id) throw new Error("not auth");
      const { data, error } = await supabase
        .from("portfolio_categories")
        .insert({ user_id: user.id, name, sort_order: categories.length })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["portfolio-categories"] });
      setSelectedCatId(data.id);
      toast.success("Categoria criada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio-categories"] });
      setSelectedCatId(null);
      toast.success("Categoria removida");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePhotoFeatured = useMutation({
    mutationFn: async (p: Photo) => {
      const { error } = await supabase
        .from("portfolio_photos")
        .update({ is_featured: !p.is_featured })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portfolio-photos"] }),
  });

  const removePhoto = useMutation({
    mutationFn: async (p: Photo) => {
      // Best-effort storage cleanup
      const marker = "/photographer-assets/";
      const idx = p.image_url.indexOf(marker);
      if (idx >= 0) {
        const path = p.image_url.substring(idx + marker.length);
        await supabase.storage.from("photographer-assets").remove([path]);
      }
      const { error } = await supabase.from("portfolio_photos").delete().eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio-photos"] });
      toast.success("Foto removida");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length || !user?.id || !selectedCatId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/portfolio/${selectedCatId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("photographer-assets")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("photographer-assets").getPublicUrl(path);
        const { error } = await supabase.from("portfolio_photos").insert({
          user_id: user.id,
          category_id: selectedCatId,
          image_url: publicUrl,
          sort_order: photos.length,
        });
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["portfolio-photos"] });
      toast.success("Fotos enviadas!");
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleNewCategory = () => {
    const name = window.prompt("Nome da nova categoria:");
    if (name && name.trim()) addCategory.mutate(name.trim());
  };

  const handleDeleteCategory = (cat: Category) => {
    if (window.confirm(`Remover a categoria "${cat.name}" e todas as fotos dela?`)) {
      removeCategory.mutate(cat.id);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Meu portfólio</h2>
        <p className="text-sm text-muted-foreground">Selecione suas melhores fotos para exibir publicamente no seu site</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => {
          const active = cat.id === selectedCatId;
          return (
            <div key={cat.id} className={`group flex items-center rounded-full transition-all ${active ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"}`}>
              <button onClick={() => setSelectedCatId(cat.id)} className="pl-4 pr-2 py-2 text-sm font-medium">
                {cat.name}
              </button>
              <button
                onClick={() => handleDeleteCategory(cat)}
                title="Remover categoria"
                className={`pr-3 pl-1 py-2 opacity-60 hover:opacity-100 ${active ? "hover:text-white" : "hover:text-destructive"}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <button
          onClick={handleNewCategory}
          className="px-4 py-2 rounded-full text-sm font-medium bg-secondary/50 text-muted-foreground hover:bg-secondary flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Nova categoria
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      <div className="glass-card p-6">
        {!selectedCatId ? (
          <p className="text-sm text-muted-foreground text-center py-8">Crie uma categoria para começar.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map(p => (
              <div key={p.id} className="aspect-square rounded-xl bg-secondary/50 border border-border overflow-hidden relative group">
                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                {p.is_featured && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-yellow-500/90 text-[10px] font-bold text-white flex items-center gap-1">
                    <Star className="w-2.5 h-2.5 fill-current" /> Destaque
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePhotoFeatured.mutate(p)}
                      title={p.is_featured ? "Remover destaque" : "Marcar destaque"}
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30"
                    >
                      <Star className={`w-3.5 h-3.5 text-white ${p.is_featured ? "fill-yellow-400" : ""}`} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Remover esta foto do portfólio?")) removePhoto.mutate(p);
                      }}
                      title="Remover foto"
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/60"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary flex items-center justify-center cursor-pointer transition-colors group disabled:opacity-60"
            >
              <div className="text-center">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                ) : (
                  <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors mx-auto" />
                )}
                <p className="text-xs text-muted-foreground mt-2">{uploading ? "Enviando..." : "Adicionar"}</p>
              </div>
            </button>
            {photos.length === 0 && !uploading && (
              <div className="col-span-2 md:col-span-3 flex items-center text-sm text-muted-foreground">
                <ImageIcon className="w-4 h-4 mr-2" /> Nenhuma foto nesta categoria ainda.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabPortfolio;