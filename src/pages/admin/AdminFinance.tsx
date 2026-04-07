import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, CreditCard, ShoppingCart, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyData {
  month: string;
  receita: number;
}

const AdminFinance = () => {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    const fetchFinance = async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, amount, status, created_at");

      if (orders) {
        const paid = orders.filter(o => o.status === "pago");
        const pending = orders.filter(o => o.status === "aguardando_pagamento");

        setTotalRevenue(paid.reduce((s, o) => s + Number(o.amount), 0));
        setPendingRevenue(pending.reduce((s, o) => s + Number(o.amount), 0));
        setPaidCount(paid.length);
        setPendingCount(pending.length);

        // Monthly
        const now = new Date();
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const months: MonthlyData[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthOrders = paid.filter(o => {
            const od = new Date(o.created_at);
            return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
          });
          months.push({
            month: monthNames[d.getMonth()],
            receita: monthOrders.reduce((s, o) => s + Number(o.amount), 0),
          });
        }
        setMonthlyData(months);
      }
      setLoading(false);
    };
    fetchFinance();
  }, []);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro Global</h1>
        <p className="text-sm text-muted-foreground">Métricas financeiras reais</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Receita Total (Pago)", value: fmt(totalRevenue), icon: DollarSign },
          { label: "Pedidos Pagos", value: paidCount.toString(), icon: TrendingUp },
          { label: "Aguardando Pagamento", value: fmt(pendingRevenue), icon: CreditCard },
          { label: "Pedidos Pendentes", value: pendingCount.toString(), icon: ShoppingCart },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card p-4">
            <kpi.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4">Receita Mensal (últimos 6 meses)</h3>
        {monthlyData.some(m => m.receita > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="receita" fill="hsl(18 100% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            Nenhuma receita registrada ainda
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminFinance;
