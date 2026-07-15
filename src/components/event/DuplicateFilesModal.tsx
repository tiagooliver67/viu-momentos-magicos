import { useMemo, useState } from "react";
import { X, Image as ImageIcon, Video as VideoIcon, AlertTriangle, Sparkles } from "lucide-react";
import type { DuplicateEntry } from "@/lib/duplicateDetection";
import { formatBytes } from "@/lib/duplicateDetection";

export type DuplicateResolution = "ignore" | "replace" | "keep-both" | "update";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (choice: DuplicateResolution) => void;
  type: "photos" | "videos";
  duplicates: DuplicateEntry[];
  /** Amount of NEW (non-duplicate) files also selected. Purely informative. */
  freshCount: number;
}

const OPTIONS: {
  key: DuplicateResolution;
  title: string;
  desc: string;
  badge?: string;
  icon?: typeof Sparkles;
}[] = [
  { key: "ignore",    title: "Ignorar arquivos duplicados",      desc: "Os arquivos com o mesmo nome não serão enviados novamente.", badge: "Recomendado" },
  { key: "replace",   title: "Substituir arquivos existentes",   desc: "Os arquivos atuais serão substituídos pelos novos." },
  { key: "keep-both", title: "Manter todos os arquivos",         desc: "Envia todos os arquivos renomeando os duplicados (ex.: DSC04311 (2).JPG)." },
  { key: "update",    title: "Atualizar evento",                 desc: "Ignora idênticos, substitui os alterados e envia apenas o que é novo.", badge: "ViuFoto", icon: Sparkles },
];

export default function DuplicateFilesModal({ open, onClose, onConfirm, type, duplicates, freshCount }: Props) {
  const [choice, setChoice] = useState<DuplicateResolution>("ignore");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const isPhoto = type === "photos";

  const identicalCount = useMemo(() => duplicates.filter(d => d.identical).length, [duplicates]);
  const diffCount      = useMemo(() => duplicates.filter(d => d.differentContent).length, [duplicates]);

  if (!open) return null;

  const handleConfirm = () => {
    if (choice === "replace" && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    onConfirm(choice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-bold text-foreground text-lg">Arquivos duplicados encontrados</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <p className="text-sm text-muted-foreground">
            Encontramos <strong className="text-foreground">{duplicates.length}</strong>{" "}
            arquivo(s) que já existem neste evento
            {freshCount > 0 && <> — outros <strong className="text-foreground">{freshCount}</strong> arquivo(s) são novos</>}.
            Escolha como deseja prosseguir.
          </p>

          {(identicalCount > 0 || diffCount > 0) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {identicalCount > 0 && (
                <span className="px-2 py-1 rounded-md bg-lime/10 text-lime border border-lime/30">
                  {identicalCount} idêntico(s)
                </span>
              )}
              {diffCount > 0 && (
                <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/30">
                  {diffCount} com mesmo nome, conteúdo diferente
                </span>
              )}
            </div>
          )}

          {/* Duplicate list */}
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">
              Arquivos com nome duplicado <span className="text-foreground">({duplicates.length})</span>
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {duplicates.map((d, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-secondary/30">
                  <div className="flex items-center gap-2 min-w-0">
                    {isPhoto ? <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" /> : <VideoIcon className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate">{d.file.name}</div>
                      {d.differentContent && (
                        <div className="text-[11px] text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Conteúdo diferente do arquivo existente
                        </div>
                      )}
                      {d.identical && (
                        <div className="text-[11px] text-lime">Idêntico ao existente</div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">{formatBytes(d.file.size)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <p className="text-sm font-bold text-foreground mb-2">O que você quer fazer?</p>
            <div className="space-y-2">
              {OPTIONS.map(opt => {
                const selected = choice === opt.key;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => { setChoice(opt.key); setConfirmReplace(false); }}
                    className={`w-full text-left rounded-xl border p-3 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-primary" : "border-muted-foreground"}`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
                          <span className="text-sm font-bold text-foreground">{opt.title}</span>
                          {opt.badge && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-lime/20 text-lime uppercase tracking-wide">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {choice === "replace" && confirmReplace && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground flex gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <strong>Esta ação substituirá permanentemente os arquivos existentes.</strong>
                <p className="text-muted-foreground text-xs mt-1">Clique novamente em Confirmar para prosseguir.</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">A comparação é feita pelo conteúdo do arquivo (hash SHA-256) e, como fallback, por nome e tamanho.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium">Cancelar</button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${choice === "replace" && confirmReplace ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
            >
              {choice === "replace" && confirmReplace ? "Sim, substituir" : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}