import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DesempenhoChartProps {
  orders: { created_at: string; amount: number | string }[];
}

type Range = 7 | 30 | 90;

const DesempenhoChart = ({ orders }: DesempenhoChartProps) => {
  const [range, setRange] = useState<Range>(7);

  const data = useMemo(() => {
    const days: { date: string; label: string; total: number; pedidos: number }[] = [];
    const today = new Date();
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        total: 0,
        pedidos: 0,
      });
    }
    const map = new Map(days.map((d) => [d.date, d]));
    orders.forEach((o) => {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      const slot = map.get(key);
      if (slot) {
        slot.total += Number(o.amount);
        slot.pedidos += 1;
      }
    });
    return days;
  }, [orders, range]);

  const totalRange = data.reduce((s, d) => s + d.total, 0);
  const hasData = totalRange > 0;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-semibold text-foreground">Desempenho</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total no período: <strong className="text-foreground">R$ {fmt(totalRange)}</strong>
          </p>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          {([7, 30, 90] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 font-semibold transition-colors ${
                range === r ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {r} dias
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <div className="h-64 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                formatter={(value: number, name) => name === "total" ? [`R$ ${fmt(value)}`, "Faturamento"] : [value, "Pedidos"]}
              />
              <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-center px-4">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-sm font-semibold text-foreground">Sua primeira venda aparece aqui</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Compartilhe seus eventos e acompanhe o desempenho diário do seu faturamento.
          </p>
        </div>
      )}
    </div>
  );
};

export default DesempenhoChart;