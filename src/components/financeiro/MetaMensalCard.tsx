import { Target, Pencil, Check } from "lucide-react";
import { useEffect, useState } from "react";

interface MetaMensalCardProps {
  faturamento: number;
}

const STORAGE_KEY = "viufoto:meta-mensal";

const MetaMensalCard = ({ faturamento }: MetaMensalCardProps) => {
  const [meta, setMeta] = useState<number>(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY) || 0);
    setMeta(stored);
    if (!stored) setEditing(true);
  }, []);

  const save = () => {
    const v = Number(draft.replace(",", ".")) || 0;
    setMeta(v);
    localStorage.setItem(STORAGE_KEY, String(v));
    setEditing(false);
  };

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const pct = meta > 0 ? Math.min(100, (faturamento / meta) * 100) : 0;

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Target className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Meta do mês</h3>
            <p className="text-xs text-muted-foreground">Defina seu objetivo de faturamento</p>
          </div>
        </div>
        {!editing && meta > 0 && (
          <button onClick={() => { setDraft(String(meta)); setEditing(true); }} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Pencil className="w-3 h-3" /> Editar
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background flex-1">
            <span className="text-sm text-muted-foreground">R$</span>
            <input
              autoFocus
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="5000,00"
              className="bg-transparent outline-none text-sm flex-1 min-w-0"
            />
          </div>
          <button onClick={save} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 hover:bg-primary/90">
            <Check className="w-4 h-4" /> Salvar
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-2xl font-extrabold text-foreground">R$ {fmt(faturamento)}</span>
            <span className="text-sm text-muted-foreground">de R$ {fmt(meta)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {pct >= 100 ? "🎉 Meta batida! Parabéns." : `${pct.toFixed(0)}% concluído — faltam R$ ${fmt(Math.max(0, meta - faturamento))}`}
          </p>
        </>
      )}
    </div>
  );
};

export default MetaMensalCard;