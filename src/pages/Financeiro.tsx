import DashboardSidebar from "@/components/DashboardSidebar";
import { DollarSign, ArrowUpRight, ArrowDownRight, ChevronDown } from "lucide-react";

const transactions = [
  { date: "23/03/2026", amount: "R$ 196,22", type: "credit" },
  { date: "22/03/2026", amount: "R$ 543,35", type: "credit" },
  { date: "21/03/2026", amount: "R$ 296,18", type: "credit" },
  { date: "20/03/2026", amount: "R$ 19,80", type: "credit" },
  { date: "19/03/2026", amount: "R$ 9,90", type: "credit" },
  { date: "18/03/2026", amount: "R$ 36,00", type: "credit" },
  { date: "18/03/2026", amount: "R$ 26,29", type: "credit" },
];

const Financeiro = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Sub nav */}
        <div className="flex items-center gap-1 mb-8 p-1 bg-secondary rounded-xl w-fit">
          {["Caixa", "Pedidos", "Fiscal"].map((tab, i) => (
            <button key={tab} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Caixa</h1>
        <p className="text-sm text-muted-foreground mb-8">Você possui 128 lançamentos</p>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-6 neon-border">
            <p className="text-sm text-muted-foreground mb-1">Disponível</p>
            <p className="text-3xl font-bold text-primary">R$ 735,29</p>
            <button className="mt-4 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all">
              TRANSFERIR
            </button>
          </div>
          <div className="glass-card p-6">
            <p className="text-sm text-muted-foreground mb-1">A receber</p>
            <p className="text-3xl font-bold text-accent">R$ 13,50</p>
            <button className="mt-4 w-full py-2.5 rounded-lg border border-accent/30 text-accent font-bold text-sm hover:bg-accent/10 transition-all">
              ANTECIPAR SALDO
            </button>
          </div>
          <div className="glass-card p-6">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-3xl font-bold text-foreground">R$ 748,79</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-lime">
              <ArrowUpRight className="w-4 h-4" />
              <span>+12% vs. mês passado</span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">Últimos Lançamentos</h2>
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border/50">
            {transactions.map((tx, i) => (
              <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-lime/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-lime" />
                  </div>
                  <span className="text-sm text-muted-foreground">{tx.date}</span>
                </div>
                <span className="text-sm font-bold text-lime">{tx.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Financeiro;
