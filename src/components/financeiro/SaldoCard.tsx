import { ArrowRight, ChevronDown, Eye, EyeOff, Info } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCountUp } from "./useCountUp";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SaldoCardProps {
  saldoReceber: number;
  saldoDisponivel: number;
}

const SaldoCard = ({ saldoReceber, saldoDisponivel }: SaldoCardProps) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const total = saldoReceber + saldoDisponivel;
  const animDisponivel = useCountUp(saldoDisponivel, 1000, visible);
  const animReceber = useCountUp(saldoReceber, 1000, visible);
  const animTotal = useCountUp(total, 1000, visible);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground p-6 sm:p-8 shadow-xl">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold opacity-90">Seu saldo</h2>
          <button
            onClick={() => setVisible(!visible)}
            className="opacity-70 hover:opacity-100 transition-opacity min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>

        {visible ? (
          <>
            <p className="text-sm opacity-70 mb-1">Disponível para saque</p>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">
              R$ {fmt(animDisponivel)}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <TooltipProvider>
                <div className="bg-white/10 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs opacity-70">A receber</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 opacity-50 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]">
                        <p className="text-xs">Valor de vendas já confirmadas que ainda estão no prazo de liberação.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="font-bold text-sm">R$ {fmt(animReceber)}</p>
                </div>

                <div className="bg-white/10 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs opacity-70">Saldo total</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 opacity-50 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]">
                        <p className="text-xs">Soma do saldo disponível + saldo a receber.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="font-bold text-sm">R$ {fmt(animTotal)}</p>
                </div>
              </TooltipProvider>
            </div>

            <button onClick={() => navigate("/dashboard/configuracoes?tab=carteira")} className="w-full flex items-center justify-center gap-2 bg-white text-primary rounded-xl px-5 py-3.5 font-bold text-sm hover:bg-white/90 transition-all hover:shadow-lg min-h-[48px]">
              <span>Sacar agora</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </>
        ) : (
          <p className="text-sm opacity-60 italic">Valores ocultos</p>
        )}
      </div>
    </div>
  );
};

export default SaldoCard;
