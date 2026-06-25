import { Eye, EyeOff, TrendingUp, TrendingDown, Wallet, ShoppingBag, Share2, Clock } from "lucide-react";
import { useState } from "react";
import { useCountUp } from "./useCountUp";

interface KpiStripProps {
  saldoDisponivel: number;
  vendasMes: number;
  vendasCrescimentoPct: number | null;
  comissoesMes: number;
  aReceber: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const KpiStrip = ({ saldoDisponivel, vendasMes, vendasCrescimentoPct, comissoesMes, aReceber }: KpiStripProps) => {
  const [visible, setVisible] = useState(true);
  const aSaldo = useCountUp(saldoDisponivel, 1000, visible);
  const aVendas = useCountUp(vendasMes, 1000, visible);
  const aComiss = useCountUp(comissoesMes, 1000, visible);
  const aReceb = useCountUp(aReceber, 1000, visible);

  const Card = ({
    label, value, icon: Icon, accent, tooltip, extra,
  }: { label: string; value: string; icon: any; accent?: "primary" | "green" | "amber"; tooltip?: string; extra?: React.ReactNode }) => (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          accent === "green" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
          accent === "amber" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
          "bg-primary/10 text-primary"
        }`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-1" title={tooltip}>{label}</p>
      <p className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
        accent === "green" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
      }`}>
        {visible ? value : "•••••"}
      </p>
      {extra && visible && <div className="mt-2">{extra}</div>}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-end mb-2">
        <button
          onClick={() => setVisible(!visible)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
        >
          {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {visible ? "Ocultar valores" : "Mostrar valores"}
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card label="Saldo disponível" value={`R$ ${fmt(aSaldo)}`} icon={Wallet} accent="green" tooltip="Pronto para saque" />
        <Card
          label="Vendas no mês"
          value={`R$ ${fmt(aVendas)}`}
          icon={ShoppingBag}
          accent="primary"
          extra={vendasCrescimentoPct !== null && (
            <div className="flex items-center gap-1">
              {vendasCrescimentoPct >= 0
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
              <span className={`text-[11px] font-semibold ${vendasCrescimentoPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {vendasCrescimentoPct >= 0 ? "+" : ""}{vendasCrescimentoPct.toFixed(1)}% vs mês anterior
              </span>
            </div>
          )}
        />
        <Card label="Comissões no mês" value={`R$ ${fmt(aComiss)}`} icon={Share2} accent="primary" tooltip="Programa de indicação" />
        <Card label="A receber" value={`R$ ${fmt(aReceb)}`} icon={Clock} accent="amber" tooltip="Liquidação Asaas (D+1 Pix / D+30 Cartão)" />
      </div>
    </div>
  );
};

export default KpiStrip;