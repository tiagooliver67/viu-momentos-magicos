import { useState } from "react";
import { X, Plus, Minus } from "lucide-react";

interface DiscountRule {
  discount_pct: number;
  min_photos: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (pkg: { min_photos: number; discount_pct: number; all_photos_price?: number; min_photo_price?: number }) => void;
  isSaving: boolean;
}

export default function DiscountModal({ open, onClose, onSave, isSaving }: Props) {
  const [rules, setRules] = useState<DiscountRule[]>([{ discount_pct: 10, min_photos: 5 }]);
  const [allPhotosPrice, setAllPhotosPrice] = useState("");
  const [minQty, setMinQty] = useState("");
  const [minPhotoPrice, setMinPhotoPrice] = useState("");

  if (!open) return null;

  const addRule = () => setRules([...rules, { discount_pct: 0, min_photos: 0 }]);
  const removeRule = (i: number) => setRules(rules.filter((_, j) => j !== i));

  const handleSave = () => {
    // Save first rule + package info
    const r = rules[0] || { discount_pct: 10, min_photos: 5 };
    onSave({
      min_photos: r.min_photos,
      discount_pct: r.discount_pct,
      all_photos_price: allPhotosPrice ? +allPhotosPrice : undefined,
      min_photo_price: minPhotoPrice ? +minPhotoPrice : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-primary text-lg">PACOTES E DESCONTOS PROGRESSIVOS</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Informe os dados abaixo para habilitar pacotes e desconto progressivo.</p>

        <h4 className="text-sm font-bold text-foreground mb-3">DESCONTOS PROGRESSIVOS</h4>
        {rules.map((rule, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Desconto progressivo de</span>
            <input type="number" value={rule.discount_pct} onChange={e => { const n = [...rules]; n[i].discount_pct = +e.target.value; setRules(n); }} className="w-14 px-2 py-1 rounded bg-secondary border border-border text-foreground text-sm" />
            <span className="text-xs text-muted-foreground">% a partir de</span>
            <input type="number" value={rule.min_photos} onChange={e => { const n = [...rules]; n[i].min_photos = +e.target.value; setRules(n); }} className="w-14 px-2 py-1 rounded bg-secondary border border-border text-foreground text-sm" />
            <span className="text-xs text-muted-foreground">fotos</span>
            <button onClick={() => removeRule(i)} className="text-destructive"><Minus className="w-4 h-4" /></button>
          </div>
        ))}
        <button onClick={addRule} className="text-primary flex items-center gap-1 text-xs font-medium mb-6"><Plus className="w-4 h-4" /> Adicionar regra</button>

        <h4 className="text-sm font-bold text-foreground mb-3">PACOTE DE TODAS AS FOTOS</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-40">Pacote com todas as fotos:</span>
            <div className="flex items-center gap-1"><span className="text-xs">R$</span>
              <input value={allPhotosPrice} onChange={e => setAllPhotosPrice(e.target.value)} className="w-24 px-2 py-1 rounded bg-secondary border border-border text-foreground text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-40">Quantidade mínima de fotos:</span>
            <input value={minQty} onChange={e => setMinQty(e.target.value)} className="w-24 px-2 py-1 rounded bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-40">Preço mínimo por foto:</span>
            <div className="flex items-center gap-1"><span className="text-xs">R$</span>
              <input value={minPhotoPrice} onChange={e => setMinPhotoPrice(e.target.value)} className="w-24 px-2 py-1 rounded bg-secondary border border-border text-foreground text-sm" />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving} className="w-full mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm min-h-[44px] disabled:opacity-50">
          {isSaving ? "Salvando..." : "SALVAR"}
        </button>
      </div>
    </div>
  );
}
