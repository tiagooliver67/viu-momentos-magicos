import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, CreditCard, ShoppingCart, Loader2, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const COMMISSION_INICIO = 0.12;
const COMMISSION_PRO = 0.10;

const AdminFinance = () => {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [viufotoCommission, setViufotoCommission] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [ticketMedio, setTicketMedio] = useState(0);
  const [monthlyData, setMonthlyData] = useState<{ month: string; receita: number; comissao: number }[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [searchTx, setSearchTx] = useState("");

  useEffect(() => {
    const fetchFinance = async () => {
      const [{ data: orders }, { data: events }, { data: profiles }, { data: orderItems }] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("events").select("id, name, plan_type, organizer_id"),
        supabase.from("profiles").select("user_id, full_name"),
        supabase.from("order_items").select("order_id, photo_id, video_id, price"),
      ]);

      if (orders && events) {
        const paid = orders.filter(o => o.status === "pago");
        const pending = orders.filter(o => o.status === "aguardando_pagamento");
        const totalRev = paid.reduce((s, o) => s + Number(o.amount), 0);

        let commission = 0;
        paid.forEach(o => {
          const event = events.find(e => e.id === o.event_id);
          const rate = event?.plan_type === "profissional" ? COMMISSION_PRO : COMMISSION_INICIO;
          commission += Number(o.amount) * rate;
        });

        setTotalRevenue(totalRev);
        setViufotoCommission(commission);
        setPendingRevenue(pending.reduce((s, o) => s + Number(o.amount), 0));
        setPaidCount(paid.length);
        setPendingCount(pending.length);
        setTicketMedio(paid.length > 0 ? totalRev / paid.length : 0);

        const now = new Date();
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const months: { month: string; receita: number; comissao: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mo = paid.filter(o => { const od = new Date(o.created_at); return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear(); });
          const rec = mo.reduce((s, o) => s + Number(o.amount), 0);
          let com = 0;
          mo.forEach(o => { const ev = events.find(e => e.id === o.event_id); com += Number(o.amount) * (ev?.plan_type === "profissional" ? COMMISSION_PRO : COMMISSION_INICIO); });
          months.push({ month: monthNames[d.getMonth()], receita: rec, comissao: com });
        }
        setMonthlyData(months);

        // Build transactions list
        const txs = orders.slice(0, 50).map(o => {
          const event = events.find(e => e.id === o.event_id);
          const photographer = profiles?.find(p => p.user_id === event?.organizer_id);
          const rate = event?.plan_type === "profissional" ? COMMISSION_PRO : COMMISSION_INICIO;
          const commission = Number(o.amount) * rate;
          return {
            id: o.id.slice(0, 8),
            client: o.client_name,
            photographer: photographer?.full_name || "—",
            event: event?.name || "—",
            amount: Number(o.amount),
            commission,
            photographerAmount: Number(o.amount) - commission,
            status: o.status,
            date: o.created_at,
            method: o.payment_method,
          };
        });
        setTransactions(txs);
      }
      setLoading(false);
    };
    fetchFinance();
  }, []);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const statusLabel: Record<string, string> = { pago: "Pago", aguardando_pagamento: "Pendente", enviado: "Enviado", cancelado: "Cancelado" };
  const statusColor: Record<string, string> = { pago: "text-lime", aguardando_pagamento: "text-accent", cancelado: "text-destructive", enviado: "text-primary" };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const filteredTx = transactions.filter(t => t.client.toLowerCase().includes(searchTx.toLowerCase()) || t.photographer.toLowerCase().includes(searchTx.toLowerCase()) || t.event.toLowerCase().includes(searchTx.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro Global</h1>
        <p className="text-sm text-muted-foreground">Receita, comissões e transações</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: "Comissão ViuFoto", value: fmt(viufotoCommission), icon: DollarSign },
          { label: "Receita Total", value: fmt(totalRevenue), icon: TrendingUp },
          { label: "Ticket Médio", value: fmt(ticketMedio), icon: ShoppingCart },
          { label: "Pedidos Pagos", value: paidCount.toString(), icon: CreditCard },
          { label: "Pendentes", value: `${pendingCount} (${fmt(pendingRevenue)})`, icon: ShoppingCart },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card p-4">
            <kpi.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4">Receita vs Comissão (6 meses)</h3>
        {monthlyData.some(m => m.receita > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="receita" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Receita" />
                <Bar dataKey="comissao" fill="hsl(18 100% 50%)" radius={[4, 4, 0, 0]} name="Comissão" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Nenhuma receita registrada</div>
        )}
      </div>

      {/* Transactions table */}
      <div className="glass-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Transações Recentes</h3>
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5 w-64">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input value={searchTx} onChange={e => setSearchTx(e.target.value)} placeholder="Buscar..." className="bg-transparent text-sm outline-none w-full" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3 font-medium">ID</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Fotógrafo</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Evento</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">Comissão</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map(tx => (
                <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-mono text-xs text-muted-foreground">{tx.id}</td>
                  <td className="p-3">{tx.client}</td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{tx.photographer}</td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground truncate max-w-[150px]">{tx.event}</td>
                  <td className="p-3 text-right font-medium">{fmt(tx.amount)}</td>
                  <td className="p-3 text-right hidden md:table-cell text-primary font-medium">{fmt(tx.commission)}</td>
                  <td className="p-3">
                    <span className={`text-xs font-semibold ${statusColor[tx.status] || "text-muted-foreground"}`}>{statusLabel[tx.status] || tx.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTx.length === 0 && <p className="p-8 text-center text-muted-foreground text-sm">Nenhuma transação encontrada</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminFinance;
