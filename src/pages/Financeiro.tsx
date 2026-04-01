import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  Eye, EyeOff, ChevronDown, ArrowRight, Image, Video, ShoppingBag,
  Clock, FileText, Receipt, Calendar, Crown, Filter
} from "lucide-react";

const quickActions = [
  { label: "Fotos vendidas", icon: Image, color: "text-primary" },
  { label: "Vídeos vendidos", icon: Video, color: "text-primary" },
  { label: "Meus pedidos", icon: ShoppingBag, color: "text-primary" },
  { label: "Antecipar saldo", icon: Clock, color: "text-primary" },
  { label: "Antecipações", icon: Receipt, color: "text-primary" },
  { label: "Dados para NF", icon: FileText, color: "text-primary" },
  { label: "Lançamentos", icon: Calendar, color: "text-primary" },
  { label: "Faturamento - Meus Eventos", icon: Crown, color: "text-primary" },
];

const eventBilling = [
  { date: "13/03/2026", event: "Copa Caraíbas De Futsal - 13.03.2026", photos: 46, videos: 0, revenue: 460.15 },
  { date: "22/03/2026", event: "Verão Run Irecê 22.03.2026", photos: 38, videos: 0, revenue: 458.73 },
  { date: "07/03/2026", event: "Copa Caraíbas De Futsal - 07.03.2026", photos: 41, videos: 0, revenue: 400.51 },
  { date: "29/03/2026", event: "Mançanbão Run São Gabriel 29.03", photos: 31, videos: 0, revenue: 384.24 },
  { date: "08/03/2026", event: "Corrida Da Mulher Jd", photos: 46, videos: 0, revenue: 372.60 },
  { date: "27/03/2026", event: "Copa Caraíbas De Futsal - 27.03.2026", photos: 27, videos: 0, revenue: 356.46 },
  { date: "06/03/2026", event: "Copa Caraíbas De Futsal - 06.03.2026", photos: 36, videos: 0, revenue: 353.46 },
  { date: "20/03/2026", event: "Copa Caraíbas De Futsal - 20.03.2026", photos: 27, videos: 0, revenue: 346.58 },
  { date: "21/03/2026", event: "Copa Caraíbas De Futsal - 21.03.2026", photos: 26, videos: 0, revenue: 334.84 },
  { date: "14/03/2026", event: "Copa Caraíbas De Futsal - 14.03.2026", photos: 25, videos: 0, revenue: 247.67 },
  { date: "17/03/2026", event: "Amistoso Indepedente X Botafogo Ln", photos: 25, videos: 0, revenue: 225.00 },
  { date: "26/03/2026", event: "Copa Caraíbas De Futsal - 26.03.2026", photos: 12, videos: 0, revenue: 159.32 },
  { date: "31/03/2026", event: "Treino Escola Alfa 31.03", photos: 2, videos: 0, revenue: 21.60 },
  { date: "10/01/2026", event: "Copa Alfa - Quadra Noite 10.01.2026", photos: 2, videos: 0, revenue: 16.20 },
  { date: "06/01/2026", event: "Copa Alfa - Noite 06.01.2026", photos: 1, videos: 0, revenue: 9.00 },
];

const totalRevenue = eventBilling.reduce((sum, e) => sum + e.revenue, 0);
const totalPhotos = eventBilling.reduce((sum, e) => sum + e.photos, 0);

type SubTab = "Caixa" | "Pedidos" | "Fiscal";
type FilterMode = "venda" | "evento";

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState<SubTab>("Caixa");
  const [showSales, setShowSales] = useState(true);
  const [showExtract, setShowExtract] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>("venda");
  const [dateFrom, setDateFrom] = useState("2026-03-01");
  const [dateTo, setDateTo] = useState("2026-03-31");

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        {/* Sub nav */}
        <div className="bg-primary mt-14 lg:mt-0">
          <div className="flex items-center justify-center gap-2 sm:gap-6 py-3 px-4">
            {(["Caixa", "Pedidos", "Fiscal"] as SubTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
                  activeTab === tab
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financeiro</h1>
            <button className="px-4 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
              Dúvidas? <span className="font-bold text-foreground">Clique aqui</span>
            </button>
          </div>

          {/* Two cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Minhas vendas */}
            <div className="glass-card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <h2 className="text-base sm:text-lg font-bold text-foreground">Minhas vendas</h2>
                <button onClick={() => setShowSales(!showSales)} className="text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                  {showSales ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
              {showSales ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total de pedidos no mês</span>
                    <span className="font-semibold text-foreground">213</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Fotos vendidas no mês</span>
                    <span className="font-semibold text-foreground">{totalPhotos}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vídeos vendidos no mês</span>
                    <span className="font-semibold text-foreground">0</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between bg-primary/10 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-foreground">Faturamento no mês</span>
                    <span className="text-base sm:text-lg font-bold text-primary">R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Dados ocultos</p>
              )}
            </div>

            {/* Meu Extrato */}
            <div className="glass-card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <h2 className="text-base sm:text-lg font-bold text-foreground">Meu Extrato</h2>
                <button onClick={() => setShowExtract(!showExtract)} className="text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
                  {showExtract ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
              {showExtract ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Saldo a receber</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">R$ 0,00</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Saldo disponível</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">R$ 62,51</span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">Saldo total</span>
                    <span className="font-bold text-foreground">R$ 62,51</span>
                  </div>
                  <button className="mt-4 w-full flex items-center justify-between bg-primary text-primary-foreground rounded-xl px-5 py-3 font-bold text-sm hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,77,0,0.3)] min-h-[48px]">
                    <span>Transferir saldo</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Dados ocultos</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 mb-8 sm:mb-10">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="glass-card flex flex-col items-center gap-1.5 sm:gap-2.5 p-3 sm:p-4 hover:scale-105 hover:shadow-lg transition-all group min-h-[80px]"
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full border-2 border-primary/20 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                  <action.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${action.color}`} />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-muted-foreground text-center leading-tight group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </button>
            ))}
          </div>

          {/* Filter Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="flex rounded-xl overflow-hidden border border-border w-full sm:w-auto">
              <button
                onClick={() => setFilterMode("venda")}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                  filterMode === "venda"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Por período de venda
              </button>
              <button
                onClick={() => setFilterMode("evento")}
                className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                  filterMode === "evento"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Por data do evento
              </button>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-8">
            <div className="w-full sm:w-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {filterMode === "venda" ? "Período das Vendas" : "Período dos Eventos"}
              </p>
              <div className="flex items-center gap-2 sm:gap-3 glass-card px-3 sm:px-4 py-2.5">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-transparent text-sm text-foreground border-none outline-none flex-1 min-w-0"
                />
                <span className="text-muted-foreground">—</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-transparent text-sm text-foreground border-none outline-none flex-1 min-w-0"
                />
              </div>
            </div>
            <button className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all sm:mt-6 min-h-[44px]">
              <Filter className="w-4 h-4 inline mr-2" />
              FILTRAR
            </button>
          </div>

          {/* Billing - Card on mobile, table on desktop */}
          <div className="glass-card overflow-hidden">
            {/* Mobile: Card list */}
            <div className="sm:hidden divide-y divide-border/50">
              {eventBilling.map((row, i) => (
                <div key={i} className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-primary font-semibold text-sm flex-1">{row.event}</span>
                    <Crown className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{row.date}</span>
                    <span>{row.photos} fotos • {row.videos} vídeos</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">R$ {row.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              ))}
              <div className="p-4 bg-primary/5 flex items-center justify-between">
                <span className="font-bold text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-bold text-primary">R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Desktop: Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Data</th>
                    <th className="text-left p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Evento</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Qtd. Fotos</th>
                    <th className="text-center p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Qtd. Vídeos</th>
                    <th className="text-right p-4 font-semibold text-muted-foreground uppercase text-xs tracking-wider">Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {eventBilling.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="p-4 text-muted-foreground">{row.date}</td>
                      <td className="p-4">
                        <span className="text-primary font-semibold hover:underline cursor-pointer">{row.event}</span>
                        <Crown className="w-4 h-4 text-primary inline ml-2" />
                      </td>
                      <td className="p-4 text-center text-foreground">{row.photos}</td>
                      <td className="p-4 text-center text-foreground">{row.videos}</td>
                      <td className="p-4 text-right font-semibold text-foreground">
                        {row.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td colSpan={4} className="p-4 text-right font-bold text-muted-foreground uppercase text-sm">Total</td>
                    <td className="p-4 text-right text-xl font-bold text-primary">
                      {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Financeiro;
