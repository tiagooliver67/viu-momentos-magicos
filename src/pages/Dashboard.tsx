import DashboardSidebar from "@/components/DashboardSidebar";
import { Link } from "react-router-dom";
import { Camera, Video, DollarSign, ShoppingCart, TrendingUp, PlusCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["my-events"],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const statusLabel = (s: string) => {
    if (s === "ativo") return "Ativo";
    if (s === "em_breve") return "Em Breve";
    return "Inativo";
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-18 lg:pt-6 lg:p-8 overflow-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Meu Estúdio</h1>
            <p className="text-sm text-muted-foreground mt-1">Bem-vindo de volta! 🔥</p>
          </div>
          <Link to="/dashboard/criar-evento" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,77,0,0.3)] w-full sm:w-auto justify-center">
            <PlusCircle className="w-5 h-5" />
            Criar novo evento
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-8">
          {[
            { label: "Total de eventos", value: String(events.length), icon: ShoppingCart, color: "text-primary" },
            { label: "Eventos ativos", value: String(events.filter(e => e.status === "ativo").length), icon: Camera, color: "text-accent" },
            { label: "Em breve", value: String(events.filter(e => e.status === "em_breve").length), icon: Video, color: "text-lime" },
            { label: "Inativos", value: String(events.filter(e => e.status === "inativo").length), icon: DollarSign, color: "text-primary" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-lime" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Events */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="font-bold text-foreground">Meus Eventos</h2>
            <span className="text-xs text-muted-foreground">{events.length} evento(s)</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando eventos...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Nenhum evento criado ainda</p>
              <Link to="/dashboard/criar-evento" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold">Criar primeiro evento</Link>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-border/50">
                {events.map((event) => (
                  <div key={event.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/dashboard/evento/${event.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex-1">{event.name}</Link>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${event.status === "ativo" ? "bg-lime/10 text-lime" : "bg-secondary text-muted-foreground"}`}>
                        {statusLabel(event.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(event.event_date).toLocaleDateString("pt-BR")}</span>
                      <span>{event.location}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">DATA</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">EVENTO</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">LOCAL</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">CATEGORIA</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(event.event_date).toLocaleDateString("pt-BR")}</td>
                        <td className="px-6 py-4">
                          <Link to={`/dashboard/evento/${event.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">{event.name}</Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{event.location}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{event.category}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${event.status === "ativo" ? "bg-lime/10 text-lime" : event.status === "em_breve" ? "bg-yellow-500/10 text-yellow-500" : "bg-secondary text-muted-foreground"}`}>
                            {statusLabel(event.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
