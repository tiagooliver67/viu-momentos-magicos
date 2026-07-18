import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resizeImage } from "@/lib/imageResize";
import { cdnUrl } from "@/lib/cdnConfig";
import { Loader2, Upload, Trash2, ArrowUp, ArrowDown, Save, Image as ImageIcon, Video as VideoIcon, FileImage } from "lucide-react";

interface HeroSettings {
  id: string;
  title: string;
  highlight: string;
  title_color: string;
  highlight_color: string;
  transition_type: string;
  transition_duration_ms: number;
  interval_seconds: number;
  autoplay: boolean;
}

interface HeroSlide {
  id: string;
  image_path: string;
  sort_order: number;
  active: boolean;
  media_type?: "image" | "video";
  poster_path?: string | null;
}

const TRANSITIONS = [
  { value: "fade", label: "Fade (cross-fade suave)" },
  { value: "slide", label: "Slide horizontal" },
  { value: "kenburns", label: "Zoom suave (Ken Burns)" },
];

const AdminHero = () => {
  const [settings, setSettings] = useState<HeroSettings | null>(null);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [posterUploadingId, setPosterUploadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, sl] = await Promise.all([
      supabase.from("hero_settings").select("*").limit(1).maybeSingle(),
      supabase.from("hero_slides").select("*").order("sort_order", { ascending: true }),
    ]);
    if (s.data) setSettings(s.data as any);
    if (sl.data) setSlides(sl.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("hero_settings")
      .update({
        title: settings.title,
        highlight: settings.highlight,
        title_color: settings.title_color,
        highlight_color: settings.highlight_color,
        transition_type: settings.transition_type,
        transition_duration_ms: settings.transition_duration_ms,
        interval_seconds: settings.interval_seconds,
        autoplay: settings.autoplay,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configurações salvas! Alterações refletidas no site.");
  };

  const MAX_VIDEO_BYTES = 10 * 1024 * 1024; // 10 MB
  const MAX_VIDEO_SECONDS = 15;

  const probeVideoDuration = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.src = url;
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(v.duration || 0);
      };
      v.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
    });

  const uploadToS3 = async (path: string, body: Blob) => {
    const { data, error } = await supabase.functions.invoke("s3-presign", {
      body: { action: "sign_upload", object_path: path },
    });
    if (error || !data?.url) throw new Error(error?.message || "Falha ao gerar URL");
    const putRes = await fetch(data.url, {
      method: data.method || "PUT",
      headers: { "Content-Type": body.type },
      body,
    });
    if (!putRes.ok) throw new Error(`S3 status ${putRes.status}`);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const arr = Array.from(files);
      let nextOrder = (slides[slides.length - 1]?.sort_order ?? -1) + 1;
      for (const file of arr) {
        const isVideo = file.type.startsWith("video/");
        const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        if (isVideo) {
          if (file.size > MAX_VIDEO_BYTES) {
            toast.error(`"${file.name}" excede 10 MB. Comprima o vídeo antes de enviar.`);
            continue;
          }
          const duration = await probeVideoDuration(file);
          if (duration && duration > MAX_VIDEO_SECONDS + 0.5) {
            toast.error(`"${file.name}" tem ${Math.round(duration)}s. Máximo permitido: ${MAX_VIDEO_SECONDS}s.`);
            continue;
          }
          const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
          const path = `hero/${uid}.${ext}`;
          await uploadToS3(path, file);
          const { error: insErr } = await supabase.from("hero_slides").insert({
            image_path: path,
            media_type: "video",
            sort_order: nextOrder++,
            active: true,
          } as any);
          if (insErr) throw insErr;
        } else {
          const blob = await resizeImage(file, 1920, 0.85);
          const ext = blob.type === "image/webp" ? "webp" : "jpg";
          const path = `hero/${uid}.${ext}`;
          await uploadToS3(path, blob);
          const { error: insErr } = await supabase.from("hero_slides").insert({
            image_path: path,
            media_type: "image",
            sort_order: nextOrder++,
            active: true,
          } as any);
          if (insErr) throw insErr;
        }
      }
      toast.success(`${arr.length} arquivo(s) enviado(s)`);
      await load();
    } catch (e: any) {
      toast.error("Erro no upload: " + (e?.message || e));
    } finally {
      setUploading(false);
    }
  };

  const handlePosterUpload = async (slide: HeroSlide, file: File | null) => {
    if (!file) return;
    setPosterUploadingId(slide.id);
    try {
      const blob = await resizeImage(file, 1920, 0.85);
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = `hero/poster-${uid}.${ext}`;
      await uploadToS3(path, blob);
      const { error } = await supabase
        .from("hero_slides")
        .update({ poster_path: path } as any)
        .eq("id", slide.id);
      if (error) throw error;
      toast.success("Poster atualizado");
      await load();
    } catch (e: any) {
      toast.error("Erro no poster: " + (e?.message || e));
    } finally {
      setPosterUploadingId(null);
    }
  };

  const removeSlide = async (id: string) => {
    if (!confirm("Remover esta imagem?")) return;
    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSlides((prev) => prev.filter((s) => s.id !== id));
    toast.success("Imagem removida");
  };

  const toggleActive = async (s: HeroSlide) => {
    const { error } = await supabase
      .from("hero_slides")
      .update({ active: !s.active })
      .eq("id", s.id);
    if (error) return toast.error(error.message);
    setSlides((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= slides.length) return;
    const a = slides[idx];
    const b = slides[newIdx];
    const next = [...slides];
    next[idx] = b;
    next[newIdx] = a;
    // Reassign sort_order sequentially
    const updates = next.map((s, i) => ({ ...s, sort_order: i }));
    setSlides(updates);
    await Promise.all(
      updates.map((u) =>
        supabase.from("hero_slides").update({ sort_order: u.sort_order }).eq("id", u.id)
      )
    );
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Hero Section</h1>
        <p className="text-sm text-muted-foreground">
          Personalize o título, cores, imagens de fundo e transições da página inicial.
        </p>
      </div>

      {/* Conteúdo */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-semibold">Conteúdo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Título principal (H1)</label>
            <input
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Texto de destaque</label>
            <input
              value={settings.highlight}
              onChange={(e) => setSettings({ ...settings, highlight: e.target.value })}
              className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cor do título</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.title_color}
                onChange={(e) => setSettings({ ...settings, title_color: e.target.value })}
                className="w-12 h-10 rounded border border-border cursor-pointer bg-transparent"
              />
              <input
                value={settings.title_color}
                onChange={(e) => setSettings({ ...settings, title_color: e.target.value })}
                className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary font-mono"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cor do destaque (ênfase)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.highlight_color}
                onChange={(e) => setSettings({ ...settings, highlight_color: e.target.value })}
                className="w-12 h-10 rounded border border-border cursor-pointer bg-transparent"
              />
              <input
                value={settings.highlight_color}
                onChange={(e) => setSettings({ ...settings, highlight_color: e.target.value })}
                className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transição */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-semibold">Transição & Animação</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo de transição</label>
            <select
              value={settings.transition_type}
              onChange={(e) => setSettings({ ...settings, transition_type: e.target.value })}
              className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary"
            >
              {TRANSITIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Tempo de exposição (segundos)
            </label>
            <input
              type="number"
              min={2}
              max={60}
              value={settings.interval_seconds}
              onChange={(e) =>
                setSettings({ ...settings, interval_seconds: Math.max(2, Number(e.target.value) || 2) })
              }
              className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Duração da transição (ms)
            </label>
            <input
              type="number"
              min={200}
              max={5000}
              step={100}
              value={settings.transition_duration_ms}
              onChange={(e) =>
                setSettings({ ...settings, transition_duration_ms: Number(e.target.value) || 1000 })
              }
              className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm outline-none border border-border focus:border-primary"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={settings.autoplay}
            onChange={(e) => setSettings({ ...settings, autoplay: e.target.checked })}
            className="w-4 h-4 accent-primary"
          />
          Autoplay (troca automática de imagens)
        </label>
      </div>

      {/* Imagens */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-semibold flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Mídia de fundo — fotos e vídeos ({slides.length})
          </h3>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Enviando..." : "Adicionar mídia"}
            <input
              type="file"
              multiple
              accept="image/*,video/mp4,video/webm"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </div>

        {slides.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma mídia cadastrada. Adicione fotos ou vídeos para começar o slider.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {slides.map((s, i) => {
              const url = cdnUrl(s.image_path);
              const posterUrl = s.poster_path ? cdnUrl(s.poster_path) : null;
              const isVideo = s.media_type === "video";
              return (
                <div
                  key={s.id}
                  className={`relative group rounded-lg overflow-hidden border-2 ${
                    s.active ? "border-primary/40" : "border-border opacity-50"
                  } bg-secondary/30`}
                >
                  <div className="aspect-video bg-black/30">
                    {url && isVideo ? (
                      <video
                        src={url}
                        poster={posterUrl || undefined}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : url ? (
                      <img
                        src={url}
                        alt={`Slide ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="absolute top-1 left-1 flex gap-1">
                    <span className="px-2 py-0.5 rounded bg-black/70 text-white text-xs font-bold">
                      #{i + 1}
                    </span>
                    {isVideo && (
                      <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold inline-flex items-center gap-1">
                        <VideoIcon className="w-3 h-3" /> VÍDEO
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-2 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white disabled:opacity-30"
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === slides.length - 1}
                        className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActive(s)}
                        className="px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold"
                        title={s.active ? "Desativar" : "Ativar"}
                      >
                        {s.active ? "ON" : "OFF"}
                      </button>
                      {isVideo && (
                        <label
                          className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white cursor-pointer"
                          title="Definir poster (thumbnail)"
                        >
                          {posterUploadingId === s.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileImage className="w-3.5 h-3.5" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={posterUploadingId === s.id}
                            onChange={(e) => handlePosterUpload(s, e.target.files?.[0] || null)}
                          />
                        </label>
                      )}
                    </div>
                    <button
                      onClick={() => removeSlide(s.id)}
                      className="p-1.5 rounded bg-destructive/80 hover:bg-destructive text-white"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Imagens são otimizadas (WebP, máx. 1920px). Vídeos: MP4/WebM, até 15s e 10 MB, sem áudio (autoplay é sempre mudo). Servidos via CDN CloudFront.
        </p>
      </div>

      {/* Save */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold shadow-lg hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar configurações
        </button>
      </div>
    </div>
  );
};

export default AdminHero;