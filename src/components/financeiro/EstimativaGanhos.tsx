import { Sparkles, TrendingUp } from "lucide-react";
import { useCountUp } from "./useCountUp";

interface EstimativaGanhosProps {
  estimativa: number;
  eventosAtivos: number;
  fotosNoMes: number;
}

const EstimativaGanhos = ({ estimativa, eventosAtivos, fotosNoMes }: EstimativaGanhosProps) => {
  const animEst = useCountUp(estimativa, 1200, true);

  if (estimativa <= 0) return null;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800/30 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-foreground text-sm mb-1">Estimativa de ganhos futuros</h3>
          <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mb-2">
            R$ {fmt(animEst)}
          </p>
          <p className="text-xs text-muted-foreground">
            Baseado em {eventosAtivos} evento(s) ativo(s) e {fotosNoMes} fotos carregadas este mês.
          </p>
        </div>
        <TrendingUp className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1" />
      </div>
    </div>
  );
};

export default EstimativaGanhos;
