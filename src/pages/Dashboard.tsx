import DashboardSidebar from "@/components/DashboardSidebar";
import { Link } from "react-router-dom";
import { Camera, Video, DollarSign, ShoppingCart, TrendingUp, PlusCircle } from "lucide-react";

const events = [
  { id: "1", name: "VERÃO RUN IRECÊ 22.03.2026", date: "22/03/2026", photos: 2615, videos: 0, revenue: "R$ 458,73", status: "Ativo" },
  { id: "2", name: "Copa Caraíbas De Futsal 13.03.2026", date: "13/03/2026", photos: 846, videos: 0, revenue: "R$ 460,15", status: "Ativo" },
  { id: "3", name: "Treino Orla Pituaçu", date: "25/03/2026", photos: 120, videos: 0, revenue: "R$ 0,00", status: "Rascunho" },
];

const Dashboard = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-18 lg:pt-6 lg:p-8 overflow-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Meu Estúdio</h1>
            <p className="text-sm text-muted-foreground mt-1">Bem-vindo de volta, Tiago! 🔥</p>
          </div>
          <Link to="/dashboard/criar-evento" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,77,0,0.3)] w-full sm:w-auto justify-center">
            <PlusCircle className="w-5 h-5" />
            Criar novo evento
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-8">
          {[
            { label: "Total de pedidos", value: "167", icon: ShoppingCart, color: "text-primary" },
            { label: "Fotos vendidas", value: "310", icon: Camera, color: "text-accent" },
            { label: "Vídeos vendidos", value: "0", icon: Video, color: "text-lime" },
            { label: "Faturamento", value: "R$ 3.187,84", icon: DollarSign, color: "text-primary" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-lime" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{stat.label} no mês</p>
            </div>
          ))}
        </div>

        {/* Events - Card list on mobile, table on desktop */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="font-bold text-foreground">Meus Eventos</h2>
            <span className="text-xs text-muted-foreground">Período: 01/03/2026 - 24/03/2026</span>
          </div>

          {/* Mobile: Card view */}
          <div className="sm:hidden divide-y divide-border/50">
            {events.map((event) => (
              <div key={event.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/evento/${event.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex-1">{event.name}</Link>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${event.status === "Ativo" ? "bg-lime/10 text-lime" : "bg-secondary text-muted-foreground"}`}>
                    {event.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{event.date}</span>
                  <span>{event.photos} fotos • {event.videos} vídeos</span>
                </div>
                <p className="text-sm font-bold text-foreground">{event.revenue}</p>
              </div>
            ))}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">DATA</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">EVENTO</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">FOTOS</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">VÍDEOS</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">FATURAMENTO</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-muted-foreground">{event.date}</td>
                    <td className="px-6 py-4">
                      <Link to={`/evento/${event.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{event.name}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{event.photos}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{event.videos}</td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{event.revenue}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${event.status === "Ativo" ? "bg-lime/10 text-lime" : "bg-secondary text-muted-foreground"}`}>
                        {event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
