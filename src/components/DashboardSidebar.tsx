import { Link, useLocation } from "react-router-dom";
import { Calendar, Settings, HelpCircle, PlusCircle, Briefcase, Menu, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { label: "Eventos", icon: Calendar, path: "/dashboard" },
  { label: "Oportunidades", icon: Briefcase, path: "/dashboard/oportunidades" },
  { label: "Configurações", icon: Settings, path: "/dashboard/configuracoes" },
  { label: "Ajuda", icon: HelpCircle, path: "/dashboard/ajuda" },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  /* ── real sidebar stats ── */
  const { data: sidebarStats } = useQuery({
    queryKey: ["sidebar-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { revenue: 0, photos: 0, videos: 0 };

      const { data: events } = await supabase.from("events").select("id").eq("organizer_id", user.id);
      const eventIds = (events || []).map((e) => e.id);
      if (!eventIds.length) return { revenue: 0, photos: 0, videos: 0 };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [ordersRes, photosRes, videosRes] = await Promise.all([
        supabase.from("orders").select("amount").in("event_id", eventIds).eq("status", "pago").gte("created_at", startOfMonth),
        supabase.from("event_photos").select("id", { count: "exact", head: true }).in("event_id", eventIds),
        supabase.from("event_videos").select("id", { count: "exact", head: true }).in("event_id", eventIds),
      ]);

      const revenue = (ordersRes.data || []).reduce((s, o) => s + Number(o.amount), 0);
      return { revenue, photos: photosRes.count || 0, videos: videosRes.count || 0 };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const sidebarContent = (
    <>
      <Link to="/" className="flex items-center gap-2 mb-8 px-3">
        <span className="text-2xl font-black">
          <span className="text-primary">VIU</span>
          <span className="text-foreground">FOTO</span>
        </span>
      </Link>

      <Link to="/dashboard/criar-evento" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm mb-6 hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
        <PlusCircle className="w-5 h-5" />
        Criar novo evento
      </Link>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="glass-card p-4 mt-auto">
        <p className="text-xs text-muted-foreground mb-1">Faturamento do mês</p>
        <p className="text-xl font-bold text-primary">
          R$ {(sidebarStats?.revenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>📸 {sidebarStats?.photos ?? 0} fotos</span>
          <span>📹 {sidebarStats?.videos ?? 0} vídeos</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background/90 backdrop-blur-xl border-b border-border flex items-center justify-between px-4">
        <Link to="/" className="text-xl font-black">
          <span className="text-primary">VIU</span>
          <span className="text-foreground">FOTO</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full bg-sidebar border-r border-sidebar-border p-4 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xl font-black">
                <span className="text-primary">VIU</span>FOTO
              </span>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border p-4">
        {sidebarContent}
      </aside>
    </>
  );
};

export default DashboardSidebar;
