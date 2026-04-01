import { Link, useLocation } from "react-router-dom";
import { Search, Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isHome ? "bg-background/60 backdrop-blur-xl" : "bg-background/90 backdrop-blur-xl"} border-b border-border`}>
      <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-black tracking-tight">
            <span className="text-primary">VIU</span>
            <span className="text-foreground">FOTO</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Meus Pedidos</Link>
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Sou Fotógrafo</Link>
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Sou Organizador</Link>
          <Link to="/viu-pass" className="text-primary font-bold hover:text-primary/80 transition-colors">VIU Pass</Link>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all min-w-[44px] min-h-[44px] flex items-center justify-center">
            <Search className="w-5 h-5" />
          </button>
          <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all hover:shadow-[0_0_20px_rgba(255,77,0,0.3)]">
            Login
          </Link>
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
          <Link to="/" className="block py-3 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors" onClick={() => setMobileOpen(false)}>Meus Pedidos</Link>
          <Link to="/dashboard" className="block py-3 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors" onClick={() => setMobileOpen(false)}>Sou Fotógrafo</Link>
          <Link to="/dashboard" className="block py-3 px-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors" onClick={() => setMobileOpen(false)}>Sou Organizador</Link>
          <Link to="/viu-pass" className="block py-3 px-3 text-primary font-bold hover:bg-primary/10 rounded-lg transition-colors" onClick={() => setMobileOpen(false)}>VIU Pass</Link>
          <div className="pt-2 border-t border-border mt-2">
            <Link to="/dashboard" className="block py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-center" onClick={() => setMobileOpen(false)}>Login</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
