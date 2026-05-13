import { Tag, Sparkles } from "lucide-react";
import { useEventDiscount } from "@/hooks/useEventDiscount";

interface Props {
  eventId: string;
}

export default function DiscountBanner({ eventId }: Props) {
  const { data } = useEventDiscount(eventId);
  if (!data?.enabled || data.rules.length === 0) return null;

  const maxPct = Math.max(...data.rules.map((r) => r.discount_pct));

  return (
    <div className="mb-4 sm:mb-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-4 sm:py-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight">
              GANHE ATÉ <span className="text-primary">{maxPct}% DE DESCONTO</span>!
            </h3>
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
              Os descontos são aplicados automaticamente no carrinho.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {data.rules.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border/70"
            >
              <Tag className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <div className="text-xs sm:text-sm leading-tight">
                <span className="font-semibold text-foreground">{r.min_photos} fotos</span>
                <span className="text-muted-foreground"> = </span>
                <span className="font-bold text-primary">{r.discount_pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}