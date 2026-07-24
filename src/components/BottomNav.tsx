import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, Heart, ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/buscar", label: "Buscar", icon: Search },
  { to: "/favoritos", label: "Favoritos", icon: Heart },
  { to: "/meus-pedidos", label: "Pedidos", icon: ShoppingBag },
];

const BottomNav = () => {
  const { pathname } = useLocation();
  const { user, hasRole } = useAuth();

  // Hide on admin, dashboard (has its own nav), and auth flows
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/recuperar-senha") ||
    pathname.startsWith("/reset-password")
  ) {
    return null;
  }

  const isPhotographer = user && (hasRole("photographer") || hasRole("organizer"));
  const profileTo = !user ? "/login" : isPhotographer ? "/dashboard" : "/meus-pedidos";
  const ProfileIcon = User;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação principal"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Icon className="w-5 h-5" strokeWidth={2.2} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
        <li>
          <NavLink
            to={profileTo}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`
            }
          >
            <ProfileIcon className="w-5 h-5" strokeWidth={2.2} />
            <span>{user ? "Perfil" : "Entrar"}</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default BottomNav;