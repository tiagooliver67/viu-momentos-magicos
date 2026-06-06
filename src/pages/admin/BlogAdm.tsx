import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit2, Trash2, ExternalLink, Eye, FileText, Loader2, Image as ImageIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { slugify, renderMarkdown } from "@/lib/markdown";

type Post = {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: "draft" | "published";
  views_count: number;
  meta_title: string | null;
  meta_description: string | null;
  featured_image: string | null;
  published_at: string | null;
  created_at: string;
};

const empty = (): Partial<Post> => ({
  title: "",
  slug: "",
  content: "",
  status: "draft",
  meta_title: "",
  meta_description: "",
  featured_image: "",
});

const BlogAdm = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onTitleChange = (title: string) => {
    setEditing((cur) => {
      if (!cur) return cur;
      const autoSlug = !cur.id && (!cur.slug || cur.slug === slugify(cur.title || ""));
      return { ...cur, title, slug: autoSlug ? slugify(title) : cur.slug };
    });
  };

  const handleUpload = async (file: File) => {
    if (!editing) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${(editing.slug || "post")}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("blog-covers").upload(path, file, { upsert: true, contentType: file.type });
      if (up.error) throw up.error;
      const { data } = supabase.storage.from("blog-covers").getPublicUrl(path);
      setEditing({ ...editing, featured_image: data.publicUrl });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err?.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.slug?.trim()) {
      toast({ title: "Preencha título e slug", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: editing.title.trim(),
        slug: slugify(editing.slug),
        content: editing.content || "",
        status: editing.status || "draft",
        meta_title: editing.meta_title?.trim() || null,
        meta_description: editing.meta_description?.trim() || null,
        featured_image: editing.featured_image || null,
      };
      if (editing.status === "published" && !editing.published_at) {
        payload.published_at = new Date().toISOString();
      }
      if (editing.id) {
        const { error } = await (supabase as any).from("blog_posts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        payload.published_at = payload.status === "published" ? new Date().toISOString() : null;
        const { error } = await (supabase as any).from("blog_posts").insert(payload);
        if (error) throw error;
      }
      toast({ title: "Salvo com sucesso!" });
      setEditing(null);
      setPreview(false);
      await load();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err?.message ?? "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p: Post) => {
    const newStatus = p.status === "published" ? "draft" : "published";
    const patch: any = { status: newStatus };
    if (newStatus === "published" && !p.published_at) patch.published_at = new Date().toISOString();
    const { error } = await (supabase as any).from("blog_posts").update(patch).eq("id", p.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: newStatus === "published" ? "Publicado" : "Movido para rascunho" }); load(); }
  };

  const del = async (p: Post) => {
    if (!confirm(`Excluir "${p.title}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await (supabase as any).from("blog_posts").delete().eq("id", p.id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Excluído" }); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black">Blog</h1>
          <p className="text-sm text-muted-foreground">Gerencie os artigos publicados em /blog.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/blog" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary text-sm">
            <ExternalLink className="w-4 h-4" /> Ver blog
          </Link>
          <button onClick={() => setEditing(empty())} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90">
            <Plus className="w-4 h-4" /> Novo post
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Título</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Criado em</th>
                <th className="text-left px-4 py-3 font-semibold">Views</th>
                <th className="text-right px-4 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Carregando...</td></tr>
              ) : posts.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Nenhum post ainda. Clique em "Novo post".</td></tr>
              ) : posts.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(p)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === "published" ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}
                    >
                      {p.status === "published" ? "Publicado" : "Rascunho"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 text-muted-foreground inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {p.views_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Link to={`/blog/${p.slug}`} target="_blank" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" title="Ver no site">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button onClick={() => setEditing(p)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => del(p)} className="p-2 rounded-lg hover:bg-secondary text-destructive" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-start md:items-center justify-center p-0 md:p-6 overflow-y-auto">
          <div className="bg-background w-full max-w-4xl rounded-none md:rounded-2xl border border-border my-0 md:my-6">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" /> {editing.id ? "Editar post" : "Novo post"}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreview(!preview)} className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary">
                  {preview ? "Editar" : "Pré-visualizar"}
                </button>
                <button onClick={() => { setEditing(null); setPreview(false); }} className="p-2 rounded-lg hover:bg-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {preview ? (
                <div>
                  {editing.featured_image && (
                    <div className="rounded-xl overflow-hidden border border-border mb-6">
                      <img src={editing.featured_image} alt="" className="w-full h-auto" />
                    </div>
                  )}
                  <h1 className="text-3xl font-black mb-4">{editing.title || "Sem título"}</h1>
                  <div>{renderMarkdown(editing.content || "")}</div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Título</label>
                    <input
                      value={editing.title || ""}
                      onChange={(e) => onTitleChange(e.target.value)}
                      className="w-full mt-1 bg-card border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary"
                      placeholder="Como vender fotos de eventos esportivos..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Slug (URL amigável)</label>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-muted-foreground px-3 py-2.5 bg-secondary/40 border border-r-0 border-border rounded-l-lg">/blog/</span>
                      <input
                        value={editing.slug || ""}
                        onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                        className="flex-1 bg-card border border-border rounded-r-lg px-3 py-2.5 outline-none focus:border-primary text-sm"
                        placeholder="como-vender-fotos"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Imagem de capa</label>
                    <div className="mt-1 flex items-center gap-3">
                      {editing.featured_image ? (
                        <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-border">
                          <img src={editing.featured_image} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => setEditing({ ...editing, featured_image: "" })} className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-32 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <label className="px-3 py-2 rounded-lg border border-border cursor-pointer hover:bg-secondary text-sm">
                        {uploading ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</span> : "Selecionar imagem"}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Conteúdo</label>
                    <p className="text-xs text-muted-foreground mb-1">Use <code className="bg-secondary px-1 rounded">## Título</code> para H2, <code className="bg-secondary px-1 rounded">### Subtítulo</code> para H3, <code className="bg-secondary px-1 rounded">- item</code> para listas, <code className="bg-secondary px-1 rounded">**negrito**</code>.</p>
                    <textarea
                      value={editing.content || ""}
                      onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                      className="w-full mt-1 bg-card border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary min-h-[320px] font-mono text-sm"
                      placeholder="## Introdução&#10;&#10;Seu texto aqui..."
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-border">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Meta Title (SEO) <span className="opacity-60">— {(editing.meta_title || "").length}/60</span></label>
                      <input
                        maxLength={70}
                        value={editing.meta_title || ""}
                        onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })}
                        className="w-full mt-1 bg-card border border-border rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Status</label>
                      <select
                        value={editing.status || "draft"}
                        onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}
                        className="w-full mt-1 bg-card border border-border rounded-lg px-3 py-2 outline-none focus:border-primary text-sm"
                      >
                        <option value="draft">Rascunho</option>
                        <option value="published">Publicado</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-muted-foreground">Meta Description (SEO) <span className="opacity-60">— {(editing.meta_description || "").length}/160</span></label>
                      <textarea
                        maxLength={180}
                        value={editing.meta_description || ""}
                        onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })}
                        className="w-full mt-1 bg-card border border-border rounded-lg px-3 py-2 outline-none focus:border-primary text-sm min-h-[70px]"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-background">
              <button onClick={() => { setEditing(null); setPreview(false); }} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">
                Cancelar
              </button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogAdm;