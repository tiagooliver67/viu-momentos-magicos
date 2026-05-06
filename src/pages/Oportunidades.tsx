import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import {
  Briefcase, Calendar, MapPin, Lightbulb, ArrowRight,
  PlusCircle, FileText, Award, BookOpen, Image as ImageIcon,
  Megaphone, Sparkles, TrendingUp, Search,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────
   Página: Oportunidades (fotógrafo)
   Inspirada no padrão de mercado (Fotop), porém repensada
   para o ViuFoto: minimalista, light theme, dados reais,
   sem recursos obsoletos (pontos, panfletos, "novidades").
   ────────────────────────────────────────────────────────── */

const Oportunidades = () => {
  const { user, profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0] || "Fotógrafo";

  /* ── Eventos abertos: upcoming + status público (em_breve / ativo) ── */
  const { data: openEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["open-events"],
    queryFn: async () => {
      const today = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("id, name, location, event_date, category, status, cover_url")
        .in("status", ["em_breve", "ativo"])
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  /* ── Meus eventos (trabalhos confirmados como organizador/fotógrafo) ── */
  const { data: myEvents = [], isLoading: loadingMine } = useQuery({
    queryKey: ["my-confirmed-events", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const today = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("id, name, location, event_date, status")
        .eq("organizer_id", user.id)
        .gte("event_date", today)
        .order("event_date", { ascending: true })
        .limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const stats = useMemo(() => ({
    abertos: openEvents.length,
    proximos: myEvents.length,
  }), [openEvents, myEvents]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-18 lg:pt-6 lg:p-8 overflow-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <Briefcase className="w-3.5 h-3.5" /> Oportunidades
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Oi, {firstName} — encontre seu próximo trabalho 📸
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Eventos abertos para fotografar, propostas e ferramentas para crescer no ViuFoto.
            </p>
          </div>

          {/* KPIs rápidos */}
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Abertos</p>
              <p className="text-xl font-bold text-primary">{stats.abertos}</p>
            </div>
            <div className="flex-1 sm:flex-none rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Meus próximos</p>
              <p className="text-xl font-bold text-foreground">{stats.proximos}</p>
            </div>
          </div>
        </div>

        {/* GRID PRINCIPAL — 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── COLUNA A: Eventos abertos ── */}
          <section className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
            <header className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-foreground">Eventos abertos</h2>
                  <p className="text-xs text-muted-foreground">Disponíveis para fotografar</p>
                </div>
              </div>
              <Link
                to="/buscar"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </header>

            <div className="p-5">
              {loadingEvents ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl shimmer-skeleton" />
                  ))}
                </div>
              ) : openEvents.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="Nenhum evento aberto agora"
                  desc="Assim que organizadores publicarem eventos, eles aparecerão aqui."
                />
              ) : (
                <ul className="space-y-2">
                  {openEvents.map((ev) => (
                    <li key={ev.id}>
                      <Link
                        to={`/evento/${ev.id}`}
                        className="group flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 transition-all"
                      >
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {ev.cover_url ? (
                            <img src={ev.cover_url} alt={ev.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {ev.name}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" /> {ev.location}
                          </p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground bg-muted px-2 py-1 rounded-md">
                            <Calendar className="w-3 h-3" /> {formatDate(ev.event_date)}
                          </span>
                          {ev.category && (
                            <p className="text-[10px] text-muted-foreground mt-1 capitalize">{ev.category}</p>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ── COLUNA B: Meus próximos trabalhos ── */}
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <header className="flex items-center gap-2 p-5 border-b border-border">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-foreground">Meus próximos trabalhos</h2>
                <p className="text-xs text-muted-foreground">Eventos que você organiza</p>
              </div>
            </header>

            <div className="p-5">
              {loadingMine ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl shimmer-skeleton" />
                  ))}
                </div>
              ) : myEvents.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="Nenhum trabalho próximo"
                  desc="Crie seu primeiro evento ou candidate-se a um aberto."
                  action={{ label: "Criar evento", to: "/dashboard/criar-evento" }}
                />
              ) : (
                <ul className="space-y-2">
                  {myEvents.map((ev) => (
                    <li key={ev.id}>
                      <Link
                        to={`/dashboard/evento/${ev.id}`}
                        className="block p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 transition-all"
                      >
                        <p className="text-sm font-semibold text-foreground truncate">{ev.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" /> {ev.location}
                          </span>
                          <span className="text-xs font-medium text-primary whitespace-nowrap">
                            {formatDate(ev.event_date)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* AÇÕES RÁPIDAS — repensadas para ViuFoto (sem pontos/panfletos) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">Ferramentas para crescer</h2>
            <span className="text-xs text-muted-foreground">Recursos do ViuFoto</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <ActionCard
              icon={PlusCircle}
              title="Criar evento"
              desc="Comece a vender hoje"
              to="/dashboard/criar-evento"
              highlight
            />
            <ActionCard
              icon={Megaphone}
              title="Sugerir evento"
              desc="Envie ideia ao time"
              to="/dashboard/configuracoes?tab=suporte"
            />
            <ActionCard
              icon={ImageIcon}
              title="Meu portfólio"
              desc="Personalize sua loja"
              to="/dashboard/configuracoes?tab=meu-site"
            />
            <ActionCard
              icon={TrendingUp}
              title="Financeiro"
              desc="Saldo e saques"
              to="/dashboard/configuracoes?tab=carteira"
            />
            <ActionCard
              icon={BookOpen}
              title="Regras de uso"
              desc="Boas práticas"
              to="/dashboard/ajuda"
            />
          </div>
        </section>

        {/* CTA EDUCACIONAL */}
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">Quer aparecer mais no ViuFoto?</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Capriche no portfólio, mantenha preços competitivos e habilite buscas inteligentes nos seus eventos.
            </p>
          </div>
          <Link
            to="/dashboard/configuracoes?tab=meu-site"
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all whitespace-nowrap flex items-center gap-2"
          >
            Otimizar perfil <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  );
};

/* ── helpers ── */
const EmptyState = ({
  icon: Icon, title, desc, action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  action?: { label: string; to: string };
}) => (
  <div className="text-center py-8 px-4">
    <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-muted-foreground" />
    </div>
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{desc}</p>
    {action && (
      <Link
        to={action.to}
        className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-primary hover:underline"
      >
        {action.label} <ArrowRight className="w-3 h-3" />
      </Link>
    )}
  </div>
);

const ActionCard = ({
  icon: Icon, title, desc, to, highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  to: string;
  highlight?: boolean;
}) => (
  <Link
    to={to}
    className={`group p-4 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-lg ${
      highlight
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card border-border hover:border-primary/40"
    }`}
  >
    <div
      className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${
        highlight ? "bg-primary-foreground/10" : "bg-primary/10"
      }`}
    >
      <Icon className={`w-4 h-4 ${highlight ? "text-primary-foreground" : "text-primary"}`} />
    </div>
    <p className={`text-sm font-semibold ${highlight ? "text-primary-foreground" : "text-foreground"}`}>
      {title}
    </p>
    <p className={`text-[11px] mt-0.5 ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
      {desc}
    </p>
  </Link>
);

export default Oportunidades;