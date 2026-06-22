import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowUpRight } from "lucide-react";

const CATEGORIES = ["Todos", "Marketing", "Vendas", "Fotografia", "Negócios", "Cases"];

type Props = {
  children: ReactNode;
  activeCategory?: string;
  onCategoryChange?: (c: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  showFilters?: boolean;
};

const BlogLayout = ({ children, activeCategory = "Todos", onCategoryChange, searchQuery = "", onSearchChange, showFilters = true }: Props) => {
  const navigate = useNavigate();
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900">
      {/* Header próprio do blog */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-neutral-200">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="h-16 flex items-center justify-between gap-4">
            <Link to="/blog" className="flex items-center gap-2">
              <span className="text-xl md:text-2xl font-black tracking-tight">
                <span className="text-[#673DE6]">VIU</span>
                <span className="text-neutral-900">FOTO</span>
                <span className="text-neutral-400 font-normal text-base md:text-lg ml-1">/ blog</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
              <Link to="/" className="hover:text-neutral-900 transition-colors">Ir para o site principal</Link>
              <Link
                to="/cadastro/fotografo"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 text-white hover:bg-neutral-700 transition-colors"
              >
                Vender fotos <ArrowUpRight className="w-4 h-4" />
              </Link>
            </nav>

            <button
              className="md:hidden text-sm font-medium text-neutral-700"
              onClick={() => navigate("/")}
            >
              Site principal
            </button>
          </div>

          {showFilters && (
            <div className="pb-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
              <div className="flex-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
                <div className="flex gap-2 min-w-max">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => onCategoryChange?.(c)}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        activeCategory === c
                          ? "bg-neutral-900 text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder="Buscar artigos..."
                  className="w-full pl-9 pr-3 py-2 rounded-full bg-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 placeholder:text-neutral-400"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer próprio limpo */}
      <footer className="border-t border-neutral-200 mt-20">
        <div className="container mx-auto px-4 max-w-6xl py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
          <div>© {new Date().getFullYear()} Viu Foto — Blog</div>
          <div className="flex items-center gap-5">
            <Link to="/" className="hover:text-neutral-900">Site principal</Link>
            <Link to="/cadastro/fotografo" className="hover:text-neutral-900">Vender fotos</Link>
            <Link to="/ajuda" className="hover:text-neutral-900">Ajuda</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogLayout;