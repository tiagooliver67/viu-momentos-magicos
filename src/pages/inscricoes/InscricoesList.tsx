import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Calendar, MapPin, Users2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, STATUS_LABEL, type RegistrationEvent } from "@/lib/inscricoes";
import { getCoverUrl } from "@/lib/eventCover";

export default function InscricoesList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<(RegistrationEvent & { _count: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("registration_events")
        .select("*")
        .eq("organizer_id", user.id)
        .order("event_date", { ascending: false });
      const ids = (data ?? []).map((e) => e.id);
      const counts: Record<string, number> = {};
      if (ids.length) {
        const { data: regs } = await supabase
          .from("event_registrations")
          .select("registration_event_id")
          .in("registration_event_id", ids);
        (regs ?? []).forEach((r) => {
          counts[r.registration_event_id] = (counts[r.registration_event_id] ?? 0) + 1;
        });
      }
      setEvents((data ?? []).map((e) => ({ ...e, _count: counts[e.id] ?? 0 })));
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />
      <main className="flex-1 p-4 md:p-8 pt-20 lg:pt-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black">Inscrições</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie seus eventos com inscrições e check-in</p>
          </div>
          <Button onClick={() => navigate("/dashboard/inscricoes/novo")} className="gap-2">
            <Plus className="w-4 h-4" /> Criar evento
          </Button>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : events.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold mb-1">Nenhum evento de inscrição ainda</p>
            <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro evento e gere o link de inscrição público.</p>
            <Button onClick={() => navigate("/dashboard/inscricoes/novo")}>Criar primeiro evento</Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {events.map((ev) => (
              <Link
                key={ev.id}
                to={`/dashboard/inscricoes/${ev.id}`}
                className="glass-card p-4 hover:border-primary/40 transition-all flex flex-col"
              >
                {ev.cover_url ? (
                  <div className="aspect-video rounded-lg bg-cover bg-center mb-3" style={{ backgroundImage: `url(${getCoverUrl(ev.cover_url, 800)})` }} />
                ) : (
                  <div className="aspect-video rounded-lg bg-secondary mb-3 flex items-center justify-center text-muted-foreground">
                    <Calendar className="w-8 h-8" />
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={ev.status === "aberto" ? "default" : "secondary"}>{STATUS_LABEL[ev.status]}</Badge>
                  {ev.status !== "rascunho" && (
                    <a
                      href={`/inscricao/${ev.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> link público
                    </a>
                  )}
                </div>
                <h3 className="font-bold text-lg mb-1 line-clamp-1">{ev.name}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(ev.event_date)}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.location}</span>
                  <span className="inline-flex items-center gap-1"><Users2 className="w-3 h-3" /> {ev._count}{ev.max_slots ? `/${ev.max_slots}` : ""}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}