import { useState } from "react";
import { X, Tag } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (coupon: { code: string; discount_type: "percentual" | "valor_fixo"; discount_value: number; max_uses: number }) => void;
  isSaving: boolean;
}

export default function CouponModal({ open, onClose, onSave, isSaving }: Props) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percentual" | "valor_fixo">("percentual");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("100");

  if (!open) return null;

  const handleSave = () => {
    if (!code || !value) return;
    onSave({ code: code.toUpperCase(), discount_type: type, discount_value: +value, max_uses: +maxUses });
    setCode(""); setValue(""); setMaxUses("100");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-lg">Criar Cupom</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Código do cupom</label>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: DESCONTO10" className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm uppercase" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tipo de desconto</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => setType("percentual")} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${type === "percentual" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>Percentual (%)</button>
              <button onClick={() => setType("valor_fixo")} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${type === "valor_fixo" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>Valor Fixo (R$)</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Valor do desconto</label>
            <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder={type === "percentual" ? "10" : "5.00"} className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Máximo de usos</label>
            <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving || !code || !value} className="w-full mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm min-h-[44px] disabled:opacity-50">
          {isSaving ? "Criando..." : "Criar Cupom"}
        </button>
      </div>
    </div>
  );
}
