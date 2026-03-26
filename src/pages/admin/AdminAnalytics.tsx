import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, AreaChart, Area } from "recharts";
import { TrendingUp, Users, Camera, DollarSign, MessageSquare } from "lucide-react";

const conversionData = [
  { day: "Seg", views: 4200, purchases: 380 },
  { day: "Ter", views: 3800, purchases: 340 },
  { day: "Qua", views: 5100, purchases: 460 },
  { day: "Qui", views: 4600, purchases: 410 },
  { day: "Sex", views: 6200, purchases: 580 },
  { day: "Sáb", views: 8500, purchases: 780 },
  { day: "Dom", views: 7200, purchases: 650 },
];

const retentionData = [
  { month: "Set", rate: 72 },
  { month: "Out", rate: 75 },
  { month: "Nov", rate: 78 },
  { month: "Dez", rate: 74 },
  { month: "Jan", rate: 80 },
  { month: "Fev", rate: 82 },
  { month: "Mar", rate: 85 },
];

const sourceData = [
  { source: "Instagram", visits: 12400, conversions: 890 },
  { source: "Google", visits: 8900, conversions: 720 },
  { source: "Direto", visits: 6500, conversions: 580 },
  { source: "Facebook", visits: 4200, conversions: 310 },
  { source: "Strava", visits: 3100, conversions: 280 },
  { source: "QR Code", visits: 2800, conversions: 420 },
];

const AdminAnalytics = () => {
  const [aiQuery, setAiQuery] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Relatórios avançados e insights de IA</p>
      </div>

      {/* AI Query */}
      <div className="glass-card p-5 border-accent/20">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">🤖 IA Global – Pergunte qualquer coisa</h3>
        <div className="flex gap-2">
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            placeholder='Ex: "Qual evento está vendendo mais?", "Compare março vs fevereiro"'
            className="flex-1 bg-secondary/50 rounded-lg px-4 py-2.5 text-sm outline-none border border-border focus:border-accent transition-colors"
          />
          <button className="px-4 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-all">
            Perguntar
          </button>
        </div>
        {aiQuery && (
          <div className="mt-3 p-3 bg-accent/5 border border-accent/15 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong className="text-accent">Resposta IA:</strong> O evento "VERÃO RUN IRECÊ 2026" lidera em vendas com R$ 8.450 em receita e 2.615 fotos vendidas. Comparando março vs fevereiro, houve aumento de 9.8% na receita total.
            </p>
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">Conversão: Views → Compras (Semana)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="views" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="purchases" fill="hsl(18 100% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4">Retenção de Usuários (%)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={retentionData}>
                <defs>
                  <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(82 100% 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(82 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[60, 100]} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="rate" stroke="hsl(82 100% 50%)" fill="url(#retGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Source table */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4">Fontes de Tráfego</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3 font-medium">Fonte</th>
                <th className="text-left p-3 font-medium">Visitas</th>
                <th className="text-left p-3 font-medium">Conversões</th>
                <th className="text-left p-3 font-medium">Taxa</th>
              </tr>
            </thead>
            <tbody>
              {sourceData.map((s) => (
                <tr key={s.source} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-medium">{s.source}</td>
                  <td className="p-3 text-muted-foreground">{s.visits.toLocaleString()}</td>
                  <td className="p-3 text-primary font-semibold">{s.conversions}</td>
                  <td className="p-3">
                    <span className="text-lime font-semibold">{((s.conversions / s.visits) * 100).toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
