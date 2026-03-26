import { DollarSign, TrendingUp, CreditCard, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const monthlyData = [
  { month: "Out", receita: 95000, repasses: 62000 },
  { month: "Nov", receita: 110000, repasses: 72000 },
  { month: "Dez", receita: 125000, repasses: 81000 },
  { month: "Jan", receita: 98000, repasses: 64000 },
  { month: "Fev", receita: 132000, repasses: 86000 },
  { month: "Mar", receita: 145000, repasses: 94000 },
];

const pendingPayouts = [
  { photographer: "Carlos Silva", amount: "R$ 8.450", dueDate: "28/03/2026", status: "pending" },
  { photographer: "Ana Costa", amount: "R$ 5.200", dueDate: "28/03/2026", status: "pending" },
  { photographer: "Roberto Lima", amount: "R$ 3.800", dueDate: "30/03/2026", status: "processing" },
  { photographer: "Marina Santos", amount: "R$ 6.100", dueDate: "01/04/2026", status: "pending" },
  { photographer: "Paulo Oliveira", amount: "R$ 2.900", dueDate: "01/04/2026", status: "pending" },
];

const AdminFinance = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financeiro Global</h1>
        <p className="text-sm text-muted-foreground">Métricas financeiras e repasses</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Receita Mensal", value: "R$ 145.000", change: "+9.8%", up: true, icon: DollarSign },
          { label: "Lucro Líquido", value: "R$ 51.000", change: "+12.3%", up: true, icon: TrendingUp },
          { label: "Repasses Pendentes", value: "R$ 26.450", change: "5 fotógrafos", up: false, icon: CreditCard },
          { label: "Chargebacks", value: "R$ 1.230", change: "0.85%", up: false, icon: AlertTriangle },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className="w-5 h-5 text-primary" />
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${kpi.up ? "text-lime" : "text-muted-foreground"}`}>
                {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : null}
                {kpi.change}
              </span>
            </div>
            <p className="text-xl font-bold">{kpi.value}</p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4">Receita vs Repasses (6 meses)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
              <Bar dataKey="receita" fill="hsl(18 100% 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="repasses" fill="hsl(186 100% 50%)" radius={[4, 4, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending payouts */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4">Repasses Pendentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3 font-medium">Fotógrafo</th>
                <th className="text-left p-3 font-medium">Valor</th>
                <th className="text-left p-3 font-medium">Vencimento</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayouts.map((p, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-medium">{p.photographer}</td>
                  <td className="p-3 text-primary font-semibold">{p.amount}</td>
                  <td className="p-3 text-muted-foreground">{p.dueDate}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === "pending" ? "bg-amber-500/15 text-amber-500" : "bg-accent/15 text-accent"}`}>
                      {p.status === "pending" ? "Pendente" : "Processando"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button className="px-3 py-1 rounded-lg bg-primary/15 text-primary text-xs font-semibold hover:bg-primary/25 transition-colors">
                      Pagar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Prediction */}
      <div className="glass-card p-5 border-accent/20">
        <h3 className="font-semibold mb-2 flex items-center gap-2">🤖 Previsão IA – Próximo Mês</h3>
        <p className="text-sm text-muted-foreground">
          Com base nos dados históricos e eventos agendados, a previsão de receita para <strong className="text-foreground">Abril/2026</strong> é de{" "}
          <strong className="text-primary">R$ 158.000 – R$ 172.000</strong>, representando crescimento de 9-18%.
          Recomenda-se priorizar os eventos em São Paulo e Bahia, que concentram 62% da receita.
        </p>
      </div>
    </div>
  );
};

export default AdminFinance;
