import { TrendingUp, Users, Camera, DollarSign, Eye, ShoppingCart, Activity, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const kpis = [
  { label: "Receita Total", value: "R$ 1.284.590", change: "+18.2%", icon: DollarSign, color: "text-primary" },
  { label: "Usuários Ativos", value: "34.281", change: "+12.5%", icon: Users, color: "text-accent" },
  { label: "Fotos Vendidas", value: "89.450", change: "+24.1%", icon: Camera, color: "text-lime" },
  { label: "Eventos Ativos", value: "142", change: "+8.3%", icon: Activity, color: "text-primary" },
  { label: "Pedidos Hoje", value: "1.247", change: "+31.4%", icon: ShoppingCart, color: "text-accent" },
  { label: "Taxa Conversão", value: "8.7%", change: "+2.1%", icon: TrendingUp, color: "text-lime" },
  { label: "Visualizações", value: "456K", change: "+15.8%", icon: Eye, color: "text-primary" },
  { label: "Fotógrafos Online", value: "87", change: "+5.2%", icon: Zap, color: "text-accent" },
];

const revenueData = [
  { month: "Jan", receita: 85000, despesas: 32000 },
  { month: "Fev", receita: 92000, despesas: 35000 },
  { month: "Mar", receita: 115000, despesas: 38000 },
  { month: "Abr", receita: 98000, despesas: 34000 },
  { month: "Mai", receita: 128000, despesas: 41000 },
  { month: "Jun", receita: 145000, despesas: 44000 },
];

const categoryData = [
  { name: "Corrida", value: 45, color: "hsl(18 100% 50%)" },
  { name: "Ciclismo", value: 25, color: "hsl(186 100% 50%)" },
  { name: "Triathlon", value: 15, color: "hsl(82 100% 50%)" },
  { name: "Outros", value: 15, color: "hsl(0 0% 40%)" },
];

const topPhotographers = [
  { name: "Carlos Silva", events: 28, sales: 4520, revenue: "R$ 45.200" },
  { name: "Ana Costa", events: 22, sales: 3870, revenue: "R$ 38.700" },
  { name: "Roberto Lima", events: 19, sales: 3200, revenue: "R$ 32.000" },
  { name: "Marina Santos", events: 15, sales: 2890, revenue: "R$ 28.900" },
  { name: "Paulo Oliveira", events: 12, sales: 2100, revenue: "R$ 21.000" },
];

const realtimeData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}h`,
  vendas: Math.floor(Math.random() * 80) + 20,
  views: Math.floor(Math.random() * 500) + 100,
}));

const Overview = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm">Visão geral da plataforma em tempo real</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-4 hover:border-primary/20 transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              <span className="text-xs font-semibold text-lime bg-lime/10 px-2 py-0.5 rounded-full">{kpi.change}</span>
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
          <h3 className="font-semibold mb-4">Receita vs Despesas (6 meses)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="receita" fill="hsl(18 100% 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="hsl(186 100% 50%)" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category pie */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">Eventos por Categoria</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Realtime + Top photographers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">Vendas em Tempo Real (Hoje)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={realtimeData}>
                <defs>
                  <linearGradient id="vendaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(18 100% 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(18 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="vendas" stroke="hsl(18 100% 50%)" fill="url(#vendaGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">🏆 Top Fotógrafos do Mês</h3>
          <div className="space-y-3">
            {topPhotographers.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.events} eventos · {p.sales} vendas</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">{p.revenue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brazil heatmap placeholder */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4">🗺️ Mapa de Calor – Eventos no Brasil</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { state: "BA", events: 42, revenue: "R$ 320K" },
            { state: "SP", events: 38, revenue: "R$ 480K" },
            { state: "RJ", events: 28, revenue: "R$ 290K" },
            { state: "MG", events: 22, revenue: "R$ 180K" },
            { state: "RS", events: 18, revenue: "R$ 150K" },
            { state: "PR", events: 15, revenue: "R$ 120K" },
            { state: "SC", events: 12, revenue: "R$ 95K" },
            { state: "CE", events: 10, revenue: "R$ 78K" },
            { state: "PE", events: 8, revenue: "R$ 65K" },
            { state: "DF", events: 6, revenue: "R$ 52K" },
          ].map((s) => (
            <div key={s.state} className="bg-secondary/50 rounded-lg p-3 text-center hover:bg-primary/10 transition-colors">
              <p className="text-2xl font-black text-primary">{s.state}</p>
              <p className="text-xs text-muted-foreground">{s.events} eventos</p>
              <p className="text-xs font-semibold">{s.revenue}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Overview;
