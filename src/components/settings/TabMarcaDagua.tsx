import { useState } from "react";
import { Save, Upload, Check, ShieldCheck, Droplets, Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";
import { usePhotographerSite } from "@/hooks/usePhotographerSite";
import BlurProtectionOverlay, { type BlurPattern } from "@/components/BlurProtectionOverlay";
import samplePhoto from "@/assets/blur-preview-sample.jpg";
import CreateWatermarkModal from "./CreateWatermarkModal";
import WatermarkLayersPreview from "./WatermarkLayersPreview";
import { useWatermarkTemplates } from "@/hooks/useWatermarkTemplates";
import type { WatermarkLayer } from "@/lib/watermarkLayers";

const patterns: { id: BlurPattern; label: string; desc: string }[] = [
  { id: "diagonal", label: "Diagonal", desc: "Revela metade da imagem na diagonal" },
  { id: "vertical", label: "Vertical", desc: "Revela metade da imagem na vertical" },
  { id: "horizontal", label: "Horizontal", desc: "Revela metade da imagem na horizontal" },
  { id: "circular", label: "Circular", desc: "Revela uma área da imagem em círculo" },
  { id: "faixa", label: "Faixa", desc: "Revela uma faixa da imagem na vertical" },
];

const PatternGlyph = ({ id, active }: { id: BlurPattern; active: boolean }) => {
  const fill = active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <rect x="1.5" y="1.5" width="21" height="21" rx="4" fill="none" stroke={fill} strokeWidth="1.6" />
      {id === "diagonal" && <path d="M3 21 L21 3 L21 21 Z" fill={fill} opacity="0.35" />}
      {id === "vertical" && <rect x="12" y="3" width="9" height="18" fill={fill} opacity="0.35" />}
      {id === "horizontal" && <rect x="3" y="12" width="18" height="9" fill={fill} opacity="0.35" />}
      {id === "circular" && <circle cx="12" cy="12" r="5" fill={fill} opacity="0.35" />}
      {id === "faixa" && <rect x="9.5" y="3" width="5" height="18" fill={fill} opacity="0.35" />}
    </svg>
  );
};

const TabMarcaDagua = () => {
  const { site, isLoading, upsertSite, uploadAsset } = usePhotographerSite();
  const { templates, createTemplate, deleteTemplate } = useWatermarkTemplates();
  const [subTab, setSubTab] = useState<"marca" | "protecao">("marca");
  const [form, setForm] = useState<Record<string, any>>({});
  const [creatorOpen, setCreatorOpen] = useState(false);

  const val = (k: string, fallback?: any) => (k in form ? form[k] : ((site as any)?.[k] ?? fallback));
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const dirty = Object.keys(form).length > 0;

  const handleSave = () => {
    if (!dirty) return;
    upsertSite.mutate(form);
    setForm({});
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadAsset(file, `watermark.${file.name.split(".").pop()}`);
      set("watermark_url", url);
      upsertSite.mutate({ watermark_url: url });
    } catch (err: any) {
      toast.error("Erro ao enviar marca d'água: " + err.message);
    }
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;

  const blurEnabled = !!val("blur_protection_enabled", false);
  const devices = val("blur_protection_devices", "mobile") as string;
  const pattern = (val("blur_protection_pattern", "faixa") || "faixa") as BlurPattern;

  return (
    <div className="glass-card p-5 sm:p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold">Marca d'água e proteção</h2>
        <p className="text-sm text-muted-foreground">
          Defina a marca d'água exibida sobre as fotos e vídeos e ative camadas extras de proteção visual.
        </p>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-6 border-b border-border">
        {([["marca", "Marca d'água", Droplets], ["protecao", "Proteção", ShieldCheck]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 pb-3 -mb-px text-sm font-medium border-b-2 transition-colors ${
              subTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {subTab === "marca" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-40 h-40 rounded-xl border border-border bg-secondary/40 flex items-center justify-center overflow-hidden">
              {val("watermark_url") ? (
                <img src={val("watermark_url")} alt="Marca d'água atual" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground px-3 text-center">Nenhuma marca d'água enviada</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium cursor-pointer min-h-[44px]">
                <Upload className="w-4 h-4" /> Enviar marca d'água (PNG)
                <input type="file" accept="image/png" className="hidden" onChange={handleWatermarkUpload} />
              </label>
              <p className="text-xs text-muted-foreground max-w-sm">
                Use PNG com fundo transparente. A marca d'água é aplicada no servidor sobre as versões
                de visualização das suas fotos e vídeos.
              </p>
            </div>
          </div>

          {/* Minhas marcas d'água */}
          <div className="pt-4 border-t border-border space-y-3">
            <div>
              <h3 className="text-base font-bold">Minhas marcas d'água</h3>
              <p className="text-sm text-muted-foreground">Modelos criados por você.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => setCreatorOpen(true)}
                className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 flex flex-col items-center justify-center gap-2 min-h-[220px] hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </span>
                <span className="text-sm font-semibold">Criar marca d'água</span>
                <span className="text-xs text-muted-foreground text-center max-w-[200px]">
                  Envie seu logo ou crie uma assinatura personalizada.
                </span>
              </button>

              {templates.map(t => (
                <div key={t.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <WatermarkLayersPreview layers={t.layers} photoUrl={samplePhoto} className="rounded-none" />
                  <div className="p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.layers.length} camada{t.layers.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const first = t.layers.find(l => l.imageUrl);
                          if (!first?.imageUrl) return toast.error("Esta marca d'água não tem imagem.");
                          set("watermark_url", first.imageUrl);
                          upsertSite.mutate({ watermark_url: first.imageUrl });
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 min-h-[36px]"
                      >
                        Aplicar
                      </button>
                      <button
                        onClick={() => deleteTemplate.mutate(t.id)}
                        className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
                        aria-label="Excluir marca d'água"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Alterar a marca d'água afetará apenas novos uploads.
            </div>
          </div>
        </div>
      )}

      {subTab === "protecao" && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-5">
            {/* Toggle */}
            <div className="flex items-start gap-3">
              <button
                role="switch"
                aria-checked={blurEnabled}
                onClick={() => set("blur_protection_enabled", !blurEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
                  blurEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${
                    blurEnabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
              <div>
                <p className="text-sm font-semibold">Ativar proteção por desfoque</p>
                <p className="text-sm text-muted-foreground">Proteja suas fotos e vídeos com o efeito de desfoque.</p>
              </div>
            </div>

            {blurEnabled && (
              <>
                {/* Devices */}
                <div className="flex flex-wrap items-center gap-6">
                  {([["mobile", "Celular"], ["all", "Celular e computador"]] as const).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => set("blur_protection_devices", id)}
                      className="flex items-center gap-2 text-sm min-h-[44px]"
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        devices === id ? "border-primary" : "border-muted-foreground/40"
                      }`}>
                        {devices === id && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Patterns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {patterns.map(p => {
                    const active = pattern === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => set("blur_protection_pattern", p.id)}
                        className={`relative text-left rounded-xl border p-4 flex gap-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          active ? "border-primary bg-primary/5" : "border-border bg-card"
                        }`}
                      >
                        <span className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          active ? "bg-primary/10" : "bg-muted"
                        }`}>
                          <PatternGlyph id={p.id} active={active} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">{p.label}</span>
                          <span className="block text-xs text-muted-foreground">{p.desc}</span>
                        </span>
                        {active && (
                          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-primary-foreground" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Preview */}
          {blurEnabled && (
            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <p className="text-sm font-semibold mb-3">Pré-visualização</p>
              <BlurProtectionOverlay
                pattern={pattern}
                imageUrl={samplePhoto}
                className="rounded-xl aspect-[2/3] w-full"
                imageClassName="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={handleSave}
          disabled={!dirty || upsertSite.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 min-h-[44px]"
        >
          <Save className="w-4 h-4" /> Salvar
        </button>
      </div>

      <CreateWatermarkModal
        open={creatorOpen}
        onClose={() => setCreatorOpen(false)}
        uploadAsset={uploadAsset}
        isSaving={createTemplate.isPending}
        onCreate={async (name: string, layers: WatermarkLayer[]) => {
          await createTemplate.mutateAsync({ name, layers });
        }}
      />
    </div>
  );
};

export default TabMarcaDagua;