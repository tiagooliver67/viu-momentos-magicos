import { Eye, EyeOff, TrendingUp, TrendingDown, Image, ShoppingBag, Trophy } from "lucide-react";
import { useState } from "react";
import { useCountUp } from "./useCountUp";

interface DesempenhoCardProps {
  totalPedidos: number;
  fotosVendidas: number;
  videosVendidos: number;
  faturamento: number;
  crescimentoPct: number | null;
  melhorEvento: string | null;
}

const DesempenhoCard = ({
  totalPedidos,
  fotosVendidas,
  videosVendidos,
  faturamento,
  crescimentoPct,
  melhorEvento,
}: DesempenhoCardProps) => {
  const [visible, setVisible] = useState(true);
  const animFat = useCountUp(faturamento, 1200, visible);
  const animPedidos = useCountUp(totalPedidos, 800, visible);
  const animFotos = useCountUp(fotosVendidas, 800, visible);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-foreground">Seu desempenho</h2>
        <button
          onClick={() => setVisible(!visible)}
          className="text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
        </button>
      </div>

      {visible ? (
        <>
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Pedidos no mês
              </span>
              <span className="font-semibold text-foreground">{Math.round(animPedidos)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Image className="w-4 h-4" /> Fotos vendidas
              </span>
              <span className="font-semibold text-foreground">{Math.round(animFotos)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Image className="w-4 h-4" /> Vídeos vendidos
              </span>
              <span className="font-semibold text-foreground">{videosVendidos}</span>
            </div>
          </div>

          {/* Faturamento */}
          <div className="bg-primary/5 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Faturamento no mês</span>
              <span className="text-lg font-bold text-primary">R$ {fmt(animFat)}</span>
            </div>
            {crescimentoPct !== null && (
              <div className="flex items-center gap-1 mt-1">
                {crescimentoPct >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className={`text-xs font-medium ${crescimentoPct >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {crescimentoPct >= 0 ? "+" : ""}{crescimentoPct.toFixed(1)}% vs mês anterior
                </span>
              </div>
            )}
          </div>

          {/* Melhor evento */}
          {melhorEvento && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
              <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Melhor evento: <strong className="text-foreground">{melhorEvento}</strong></span>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">Dados ocultos</p>
      )}
    </div>
  );
};

export default DesempenhoCard;
