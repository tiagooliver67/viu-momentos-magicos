import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface PriceGrid {
  id?: string;
  name: string;
  photo_high_price: number;
  photo_low_price: number;
  video_price: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (grid: PriceGrid) => void;
  initial?: PriceGrid;
  isSaving: boolean;
}

export default function PriceGridModal({ open, onClose, onSave, initial, isSaving }: Props) {
  const [grid, setGrid] = useState<PriceGrid>({ name: "Padrão", photo_high_price: 12, photo_low_price: 8, video_price: 10 });

  useEffect(() => {
    if (initial) setGrid(initial);
  }, [initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-primary text-lg">CADASTRO DE PREÇOS</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Defina abaixo quais produtos você quer disponibilizar e adicione o valor correspondente:</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Nome da grade</label>
            <input value={grid.name} onChange={e => setGrid({ ...grid, name: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Foto alta resolução</label>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">R$</span>
                <input type="number" step="0.01" value={grid.photo_high_price} onChange={e => setGrid({ ...grid, photo_high_price: +e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Foto baixa resolução</label>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">R$</span>
                <input type="number" step="0.01" value={grid.photo_low_price} onChange={e => setGrid({ ...grid, photo_low_price: +e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Download do vídeo</label>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-muted-foreground">R$</span>
                <input type="number" step="0.01" value={grid.video_price} onChange={e => setGrid({ ...grid, video_price: +e.target.value })} className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => onSave(grid)} disabled={isSaving} className="w-full mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm min-h-[44px] disabled:opacity-50">
          {isSaving ? "Salvando..." : "SALVAR"}
        </button>
      </div>
    </div>
  );
}
