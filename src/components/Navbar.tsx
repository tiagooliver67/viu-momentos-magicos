import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Menu, X, User, LogOut, Settings, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHome ? "bg-background/60 backdrop-blur-xl" : "bg-background/90 backdrop-blur-xl"} border-b border-border`}
    >
      <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-black tracking-tight">
            <span className="text-primary">VIU</span>
            <span className="text-foreground">FOTO</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Meus Pedidos
          </Link>
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            Sou Fotógrafo
          </Link>
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            Sou Organizador
          </Link>
          <Link to="/viu-pass" className="text-primary font-bold hover:text-primary/80 transition-colors">
            VIU Pass
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Search className="w-5 h-5" />
          </button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-all">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground max-w-[120px] truncate">{displayName}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" /> Meu Painel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/configuracoes")}>
                  <Settings className="w-4 h-4 mr-2" /> Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,77,0,0.3)]"
            >
              Entrar
            </Link>
          )}
        </div>

        <button
          className="md:hidden p-2 text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border p-4 space-y-1">
          <Link
            to="/"
            className="block py-3 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Meus Pedidos
          </Link>
          <Link
            to="/dashboard"
            className="block py-3 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Sou Fotógrafo
          </Link>
          <Link
            to="/dashboard"
            className="block py-3 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Sou Organizador
          </Link>
          <Link
            to="/viu-pass"
            className="block py-3 px-3 text-primary font-bold hover:bg-primary/10 rounded-lg transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            VIU Pass
          </Link>
          <div className="pt-2 border-t border-border mt-2">
            {user ? (
              <>
                <div className="py-2 px-3 text-sm text-foreground font-medium">{displayName}</div>
                <Link
                  to="/dashboard"
                  className="block py-3 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  Meu Painel
                </Link>
                <Link
                  to="/dashboard/configuracoes"
                  className="block py-3 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg"
                  onClick={() => setMobileOpen(false)}
                >
                  Configurações
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setMobileOpen(false);
                  }}
                  className="block w-full text-left py-3 px-3 text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="block py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-center"
                onClick={() => setMobileOpen(false)}
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
<button
  onclick="document.documentElement.classList.toggle('clean-theme')"
  class="px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-primary hover:text-white transition-colors"
>
  Alternar Tema
</button>;

export default Navbar;
