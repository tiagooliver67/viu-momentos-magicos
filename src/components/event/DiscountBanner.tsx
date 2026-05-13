import { Percent } from "lucide-react";
import { normalizeRules, maxDiscountPct, type ProgressiveRule } from "@/lib/progressiveDiscount";

interface Props {
  rules: ProgressiveRule[] | unknown;
  enabled?: boolean;
}

export default function DiscountBanner({ rules, enabled }: Props) {
  if (!enabled) return null;
  const norm = normalizeRules(rules);
  if (norm.length === 0) return null;
  const max = maxDiscountPct(norm);

  return (
    <div className="mb-4 sm:mb-6 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
      {/* Bloco principal */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 flex items-center gap-4 sm:gap-6">
        <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center flex-shrink-0">
          <Percent className="w-8 h-8 text-primary" strokeWidth={2.5} />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="text-lg sm:text-2xl font-black text-foreground leading-tight">
            GANHE ATÉ <span className="text-primary">{max}% DE DESCONTO!</span>
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Os descontos são aplicados automaticamente no carrinho.
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            (Válido somente neste álbum)
          </p>
        </div>
      </div>

      {/* Cards dos níveis */}
      <div className="grid grid-cols-3 lg:flex gap-2">
        {norm.slice(0, 3).map((r, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card px-3 sm:px-5 py-3 sm:py-4 text-center shadow-sm min-w-[88px] flex flex-col justify-center"
          >
            <p className="text-[10px] sm:text-xs font-bold tracking-wider text-muted-foreground uppercase">Ganhe</p>
            <p className="text-xl sm:text-3xl font-black text-primary leading-none my-1">{r.discount_pct}%</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
              Na compra<br />de {r.min_photos} fotos
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}