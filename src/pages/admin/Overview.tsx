import { useEffect, useState } from "react";
import { TrendingUp, Users, Camera, DollarSign, Activity, ShoppingCart, Eye, Zap, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface KpiData {
  totalRevenue: number;
  totalUsers: number;
  totalPhotos: number;
  activeEvents: number;
  totalOrders: number;
  paidOrders: number;
}

interface MonthlyRevenue {
  month: string;
  receita: number;
}

interface CategoryCount {
  name: string;
  value: number;
  color: string;
}

const categoryColors: Record<string, string> = {
  "Corrida": "hsl(18 100% 50%)",
  "Ciclismo": "hsl(186 100% 50%)",
  "Triathlon": "hsl(82 100% 50%)",
  "Outros": "hsl(0 0% 40%)",
};

const Overview = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiData>({ totalRevenue: 0, totalUsers: 0, totalPhotos: 0, activeEvents: 0, totalOrders: 0, paidOrders: 0 });
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryCount[]>([]);
  const [topPhotographers, setTopPhotographers] = useState<{ name: string; events: number; revenue: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          { count: userCount },
          { count: photoCount },
          { data: events },
          { data: orders },
          { data: profiles },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("event_photos").select("*", { count: "exact", head: true }),
          supabase.from("events").select("id, category, status, organizer_id"),
          supabase.from("orders").select("id, amount, status, created_at, event_id"),
          supabase.from("profiles").select("user_id, full_name"),
        ]);

        // KPIs
        const paidOrders = orders?.filter(o => o.status === "pago") || [];
        const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
        const activeEvents = events?.filter(e => e.status === "ativo").length || 0;

        setKpis({
          totalRevenue,
          totalUsers: userCount || 0,
          totalPhotos: photoCount || 0,
          activeEvents,
          totalOrders: orders?.length || 0,
          paidOrders: paidOrders.length,
        });

        // Monthly revenue (last 6 months)
        const now = new Date();
        const months: MonthlyRevenue[] = [];
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthOrders = paidOrders.filter(o => {
            const od = new Date(o.created_at);
            return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear();
          });
          months.push({
            month: monthNames[d.getMonth()],
            receita: monthOrders.reduce((s, o) => s + Number(o.amount), 0),
          });
        }
        setMonthlyData(months);

        // Category distribution
        const catMap: Record<string, number> = {};
        events?.forEach(e => {
          const cat = e.category || "Outros";
          catMap[cat] = (catMap[cat] || 0) + 1;
        });
        const catData = Object.entries(catMap).map(([name, value]) => ({
          name,
          value,
          color: categoryColors[name] || "hsl(0 0% 40%)",
        }));
        setCategoryData(catData);

        // Top photographers by event count
        if (events && profiles) {
          const orgMap: Record<string, number> = {};
          events.forEach(e => {
            orgMap[e.organizer_id] = (orgMap[e.organizer_id] || 0) + 1;
          });

          // Calculate revenue per organizer
          const orgRevenue: Record<string, number> = {};
          paidOrders.forEach(o => {
            const event = events.find(e => e.id === o.event_id);
            if (event) {
              orgRevenue[event.organizer_id] = (orgRevenue[event.organizer_id] || 0) + Number(o.amount);
            }
          });

          const top = Object.entries(orgMap)
            .map(([uid, count]) => {
              const profile = profiles.find(p => p.user_id === uid);
              return {
                name: profile?.full_name || "Sem nome",
                events: count,
                revenue: orgRevenue[uid] || 0,
              };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
          setTopPhotographers(top);
        }
      } catch (err) {
        console.error("Error fetching overview data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const kpiCards = [
    { label: "Receita Total", value: formatCurrency(kpis.totalRevenue), icon: DollarSign, color: "text-primary" },
    { label: "Usuários", value: kpis.totalUsers.toLocaleString(), icon: Users, color: "text-accent" },
    { label: "Fotos Enviadas", value: kpis.totalPhotos.toLocaleString(), icon: Camera, color: "text-lime" },
    { label: "Eventos Ativos", value: kpis.activeEvents.toString(), icon: Activity, color: "text-primary" },
    { label: "Total de Pedidos", value: kpis.totalOrders.toLocaleString(), icon: ShoppingCart, color: "text-accent" },
    { label: "Pedidos Pagos", value: kpis.paidOrders.toLocaleString(), icon: TrendingUp, color: "text-lime" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm">Visão geral da plataforma — dados reais</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="glass-card p-4 hover:border-primary/20 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <p className="text-xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 glass-card p-5">
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

        {/* Category pie */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">Eventos por Categoria</h3>
          {categoryData.length > 0 ? (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Nenhum evento cadastrado
            </div>
          )}
        </div>
      </div>

      {/* Top photographers */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4">🏆 Top Organizadores por Receita</h3>
        {topPhotographers.length > 0 ? (
          <div className="space-y-3">
            {topPhotographers.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.events} eventos</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">{formatCurrency(p.revenue)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum dado disponível</p>
        )}
      </div>
    </div>
  );
};

export default Overview;
