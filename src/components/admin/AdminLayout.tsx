import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AnimatedLogo from "@/components/AnimatedLogo";
import {
  BarChart3, Users, Calendar, DollarSign, Shield, Headphones, BookOpen,
  TrendingUp, Settings, Bug, Search, Bell, Sun, Moon, Menu, X,
  ChevronLeft, LogOut, Camera, CreditCard, HardDrive, ClipboardList, Image as ImageIcon,
  Activity, Trophy, Handshake, ShieldAlert
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: BarChart3, path: "/admin" },
  { label: "Usuários", icon: Users, path: "/admin/usuarios" },
  { label: "Fotógrafos", icon: Camera, path: "/admin/fotografos" },
  { label: "Eventos", icon: Calendar, path: "/admin/eventos" },
  { label: "Inscrições", icon: ClipboardList, path: "/admin/inscricoes" },
  { label: "Financeiro", icon: DollarSign, path: "/admin/financeiro" },
  { label: "Pagamentos", icon: CreditCard, path: "/admin/pagamentos" },
  { label: "Moderação", icon: Shield, path: "/admin/moderacao" },
  { label: "Storage S3", icon: HardDrive, path: "/admin/storage" },
  { label: "Suporte", icon: Headphones, path: "/admin/suporte" },
  { label: "Analytics", icon: TrendingUp, path: "/admin/analytics" },
  { label: "Configurações", icon: Settings, path: "/admin/configuracoes" },
  { label: "Hero Section", icon: ImageIcon, path: "/admin/hero" },
  { label: "Blog", icon: BookOpen, path: "/admin/blog" },
  { label: "Níveis", icon: Trophy, path: "/admin/niveis" },
  { label: "Parceiros", icon: Handshake, path: "/admin/parceiros" },
  { label: "Antifraude", icon: ShieldAlert, path: "/admin/antifraude" },
  { label: "Saúde do Sistema", icon: Activity, path: "/admin/saude" },
  { label: "Testes & Logs", icon: Bug, path: "/admin/logs" },
];

const AdminLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, profile } = useAuth();
  const displayName = profile?.full_name || user?.email || "Super Admin";
  const email = user?.email ?? "";
  const initials = (profile?.full_name || user?.email || "SA")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      {/* Sidebar Desktop */}
      <aside className={`hidden lg:flex flex-col ${collapsed ? "w-[72px]" : "w-64"} min-h-screen bg-card/80 backdrop-blur-xl border-r border-border transition-all duration-300 relative`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} p-4 border-b border-border`}>
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2">
              <AnimatedLogo />
              <span className="text-xs text-muted-foreground font-normal">Admin</span>
            </Link>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
            const isExactActive = location.pathname === item.path;
            const active = item.path === "/admin" ? isExactActive : isActive;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-border">
            <div className="glass-card p-3 text-xs text-muted-foreground flex items-center gap-2.5">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{displayName}</p>
                <p className="truncate">{email}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full bg-card border-r border-border overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <AnimatedLogo />
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="p-2 space-y-0.5">
              {navItems.map((item) => {
                const active = location.pathname === item.path || (item.path !== "/admin" && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-card/60 backdrop-blur-xl flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-secondary">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5 w-64">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                placeholder="Buscar..."
                className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-all text-sm font-medium"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
              <span className="hidden sm:inline text-muted-foreground">
                {theme === "dark" ? "Clean" : "Dark"}
              </span>
            </button>

            <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-card" />
            </button>

            <Avatar className="w-8 h-8 border border-primary/30">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
