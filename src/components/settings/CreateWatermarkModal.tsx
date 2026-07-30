import { useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Plus, Upload, MoreVertical, Copy, Trash2, Pencil,
  Smartphone, Monitor, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import samplePhoto from "@/assets/blur-preview-sample.jpg";
import WatermarkLayersPreview from "./WatermarkLayersPreview";
import {
  createLayer, MAX_WATERMARK_FILE_MB, POSITIONS, STARTER_TEMPLATES,
  type WatermarkLayer, type WatermarkMode, type WatermarkPosition,
} from "@/lib/watermarkLayers";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, layers: WatermarkLayer[]) => Promise<void> | void;
  uploadAsset: (file: File, path: string) => Promise<string>;
  isSaving?: boolean;
  /** Rótulo de contexto: diferencia marca global (perfil) da marca por evento. */
  scopeLabel?: string;
}

const MODES: { id: WatermarkMode; label: string; desc: string }[] = [
  { id: "single", label: "Padrão", desc: "Uma marca sobre a foto, com posição definida." },
  { id: "repeat", label: "Repetido", desc: "Mosaico repetido por toda a foto." },
  { id: "fill", label: "Preenchimento total", desc: "A marca cobre a imagem inteira." },
];

const Slider = ({ label, value, min, max, suffix, onChange }: {
  label: string; value: number; min: number; max: number; suffix: string; onChange: (v: number) => void;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}{suffix}</span>
    </div>
    <input
      type="range" min={min} max={max} value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full accent-[hsl(var(--primary))]"
    />
  </div>
);

const CreateWatermarkModal = ({ open, onClose, onCreate, uploadAsset, isSaving, scopeLabel }: Props) => {
  const [name, setName] = useState("Marca d'água 1");
  const [starter, setStarter] = useState("blank");
  const [layers, setLayers] = useState<WatermarkLayer[]>(() => STARTER_TEMPLATES[0].layers());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [uploading, setUploading] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  if (!open) return null;

  const active = layers.find(l => l.id === (activeId ?? layers[0]?.id)) || layers[0];

  const touch = () => setDirty(true);

  const patchActive = (patch: Partial<WatermarkLayer>) => {
    touch();
    setLayers(prev => prev.map(l => (l.id === active.id ? { ...l, ...patch } : l)));
  };

  const applyStarter = (id: string) => {
    const tpl = STARTER_TEMPLATES.find(t => t.id === id);
    if (!tpl) return;
    setStarter(id);
    setLayers(tpl.layers());
    setActiveId(null);
    touch();
  };

  const addLayer = () => {
    const layer = createLayer(`Camada ${layers.length + 1}`);
    setLayers(prev => [...prev, layer]);
    setActiveId(layer.id);
    touch();
  };

  const duplicateLayer = (id: string) => {
    const src = layers.find(l => l.id === id);
    if (!src) return;
    const copy = { ...src, id: crypto.randomUUID(), name: `${src.name} (cópia)` };
    setLayers(prev => [...prev, copy]);
    setActiveId(copy.id);
    setMenuId(null);
    touch();
  };

  const removeLayer = (id: string) => {
    if (layers.length === 1) {
      toast.error("A marca d'água precisa de pelo menos uma camada.");
      return;
    }
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeId === id) setActiveId(null);
    setMenuId(null);
    touch();
  };

  const renameLayer = (id: string) => {
    const current = layers.find(l => l.id === id);
    setRenameValue(current?.name || "");
    setRenameId(id);
    setMenuId(null);
  };

  const confirmRename = () => {
    const next = renameValue.trim();
    if (!next) return toast.error("Dê um nome para a camada.");
    setLayers(prev => prev.map(l => (l.id === renameId ? { ...l, name: next } : l)));
    setRenameId(null);
    touch();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_WATERMARK_FILE_MB * 1024 * 1024) {
      toast.error(`A imagem deve ter no máximo ${MAX_WATERMARK_FILE_MB}MB.`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const url = await uploadAsset(file, `watermarks/${active.id}.${ext}`);
      if (!url) throw new Error("Upload não retornou uma URL válida.");
      patchActive({ imageUrl: `${url}?v=${Date.now()}` });
      toast.success("Imagem da camada enviada.");
    } catch (err: any) {
      console.error("[watermark] upload falhou", err);
      toast.error("Erro ao enviar imagem: " + (err?.message || "falha desconhecida"));
    } finally {
      setUploading(false);
    }
  };

  const requestClose = () => (dirty ? setConfirmClose(true) : onClose());

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Dê um nome para a marca d'água.");
    if (!layers.some(l => l.imageUrl)) return toast.error("Envie a imagem de pelo menos uma camada.");
    try {
      await onCreate(name.trim(), layers);
      setDirty(false);
      onClose();
    } catch (err: any) {
      console.error("[watermark] salvar falhou", err);
      toast.error("Erro ao salvar marca d'água: " + (err?.message || "falha desconhecida"));
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={requestClose} />

      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl bg-card sm:rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-bold">Criar marca d'água</h3>
            <p className="text-xs text-muted-foreground">Monte sua marca em camadas e veja o resultado ao vivo.</p>
            {scopeLabel && (
              <span className="mt-1.5 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {scopeLabel}
              </span>
            )}
          </div>
          <button onClick={requestClose} className="p-2 rounded-lg hover:bg-muted" aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Nome + modelo inicial */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome da marca d'água</label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); touch(); }}
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm"
                placeholder="Ex: Marca d'água 1"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Modelo inicial</label>
              <select
                value={starter}
                onChange={e => applyStarter(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm"
              >
                {STARTER_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.label} — {t.description}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[200px_1fr_300px]">
            {/* Camadas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Camadas</p>
                <button
                  onClick={addLayer}
                  className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
                  aria-label="Adicionar camada"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <ul className="space-y-1.5">
                {layers.map(l => (
                  <li key={l.id} className="relative">
                    <button
                      onClick={() => setActiveId(l.id)}
                      className={`w-full text-left pl-3 pr-9 py-2.5 rounded-xl border text-sm truncate transition-colors ${
                        l.id === active.id ? "border-primary bg-primary/5 text-primary font-medium" : "border-border bg-card hover:bg-muted"
                      }`}
                    >
                      {l.name}
                    </button>
                    <button
                      onClick={() => setMenuId(menuId === l.id ? null : l.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-muted"
                      aria-label="Opções da camada"
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {menuId === l.id && (
                      <div className="absolute right-0 top-full mt-1 z-10 w-40 rounded-xl border border-border bg-popover shadow-lg py-1 text-sm">
                        <button onClick={() => renameLayer(l.id)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted">
                          <Pencil className="w-3.5 h-3.5" /> Renomear
                        </button>
                        <button onClick={() => duplicateLayer(l.id)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted">
                          <Copy className="w-3.5 h-3.5" /> Duplicar
                        </button>
                        <button onClick={() => removeLayer(l.id)} className="w-full flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Configuração da camada */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="w-24 h-24 rounded-xl border border-border bg-secondary/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {active.imageUrl
                    ? <img src={active.imageUrl} alt="" className="w-full h-full object-contain" />
                    : <span className="text-[11px] text-muted-foreground text-center px-2">Sem imagem</span>}
                </div>
                <div className="space-y-1.5">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium cursor-pointer min-h-[44px]">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Enviar imagem (PNG)
                    <input type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={handleUpload} />
                  </label>
                  <p className="text-xs text-muted-foreground">PNG com fundo transparente, até {MAX_WATERMARK_FILE_MB}MB.</p>
                </div>
              </div>

              {/* Modo */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Modo de aplicação</p>
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => patchActive({ mode: m.id })}
                    className={`w-full flex items-start gap-3 text-left rounded-xl border p-3 transition-colors ${
                      active.mode === m.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      active.mode === m.id ? "border-primary" : "border-muted-foreground/40"
                    }`}>
                      {active.mode === m.id && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{m.label}</span>
                      <span className="block text-xs text-muted-foreground">{m.desc}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Controles */}
              <div className="space-y-3">
                {active.mode !== "fill" && (
                  <Slider label="Tamanho" value={active.size} min={5} max={80} suffix="%" onChange={v => patchActive({ size: v })} />
                )}
                <Slider label="Opacidade" value={active.opacity} min={5} max={100} suffix="%" onChange={v => patchActive({ opacity: v })} />
                <Slider label="Rotação" value={active.rotation} min={-180} max={180} suffix="°" onChange={v => patchActive({ rotation: v })} />
                {active.mode === "repeat" && (
                  <Slider label="Espaçamento" value={active.spacing} min={0} max={200} suffix="px" onChange={v => patchActive({ spacing: v })} />
                )}
                {active.mode === "single" && (
                  <div className="space-y-1.5">
                    <p className="text-sm text-muted-foreground">Posição</p>
                    <div className="grid grid-cols-3 gap-1.5 w-32">
                      {POSITIONS.map(p => (
                        <button
                          key={p}
                          onClick={() => patchActive({ position: p as WatermarkPosition })}
                          aria-label={p}
                          className={`aspect-square rounded-md border transition-colors ${
                            active.position === p ? "border-primary bg-primary" : "border-border bg-muted hover:bg-muted/70"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Pré-visualização</p>
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setOrientation("landscape")}
                    className={`p-2 ${orientation === "landscape" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    aria-label="Horizontal"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setOrientation("portrait")}
                    className={`p-2 ${orientation === "portrait" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    aria-label="Vertical"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <WatermarkLayersPreview layers={layers} photoUrl={samplePhoto} orientation={orientation} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <button onClick={requestClose} className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium min-h-[44px]">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={isSaving || uploading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 min-h-[44px]"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Criar
          </button>
        </div>
      </div>

      {/* Confirmação de saída */}
      {renameId && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setRenameId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl space-y-3">
            <h4 className="text-base font-bold">Renomear camada</h4>
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") confirmRename();
                if (e.key === "Escape") setRenameId(null);
              }}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm"
              placeholder="Nome da camada"
            />
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setRenameId(null)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium min-h-[44px]">
                Cancelar
              </button>
              <button onClick={confirmRename} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium min-h-[44px]">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmClose && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setConfirmClose(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-card p-5 shadow-xl space-y-3">
            <h4 className="text-base font-bold">Criação não concluída</h4>
            <p className="text-sm text-muted-foreground">Você tem alterações não salvas. Deseja sair sem criar a marca d'água?</p>
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setConfirmClose(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium min-h-[44px]">
                Continuar editando
              </button>
              <button
                onClick={() => { setConfirmClose(false); setDirty(false); onClose(); }}
                className="px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium min-h-[44px]"
              >
                Sair sem criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};

export default CreateWatermarkModal;
