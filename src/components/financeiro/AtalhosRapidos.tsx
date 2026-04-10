import {
  Wallet, ShoppingBag, FileBarChart, Receipt, FileText, Calendar, Crown
} from "lucide-react";

const atalhos = [
  { label: "Sacar saldo", icon: Wallet, priority: true },
  { label: "Meus pedidos", icon: ShoppingBag, priority: true },
  { label: "Relatórios", icon: FileBarChart, priority: true },
  { label: "Antecipações", icon: Receipt, priority: false },
  { label: "Dados para NF", icon: FileText, priority: false },
  { label: "Lançamentos", icon: Calendar, priority: false },
  { label: "Faturamento - Eventos", icon: Crown, priority: false },
];

const AtalhosRapidos = () => (
  <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
    {atalhos.map((a) => (
      <button
        key={a.label}
        className="flex flex-col items-center gap-1.5 sm:gap-2.5 p-3 sm:p-4 rounded-2xl border border-border bg-card hover:scale-105 hover:shadow-md transition-all group min-h-[80px]"
      >
        <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-colors ${
          a.priority
            ? "bg-primary/10 group-hover:bg-primary/20"
            : "bg-secondary group-hover:bg-secondary/80"
        }`}>
          <a.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${a.priority ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
        </div>
        <span className="text-[10px] sm:text-xs font-medium text-muted-foreground text-center leading-tight group-hover:text-foreground transition-colors">
          {a.label}
        </span>
      </button>
    ))}
  </div>
);

export default AtalhosRapidos;
