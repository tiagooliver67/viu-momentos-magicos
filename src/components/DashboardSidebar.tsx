import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, DollarSign, Settings, Camera, Users, HelpCircle, PlusCircle, Briefcase, BarChart3 } from "lucide-react";

const menuItems = [
  { label: "Eventos", icon: Calendar, path: "/dashboard" },
  { label: "Oportunidades", icon: Briefcase, path: "/dashboard/oportunidades" },
  { label: "Financeiro", icon: DollarSign, path: "/dashboard/financeiro" },
  { label: "Configurações", icon: Settings, path: "/dashboard/configuracoes" },
  { label: "Ajuda", icon: HelpCircle, path: "/dashboard/ajuda" },
];

const DashboardSidebar = () => {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border p-4">
      <Link to="/" className="flex items-center gap-2 mb-8 px-3">
        <span className="text-2xl font-black">
          <span className="text-primary">VIU</span>
          <span className="text-foreground">FOTO</span>
        </span>
      </Link>

      <Link to="/dashboard/criar-evento" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm mb-6 hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,77,0,0.3)]">
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
        <p className="text-xl font-bold text-primary">R$ 3.187,84</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>📸 310 fotos</span>
          <span>📹 0 vídeos</span>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
