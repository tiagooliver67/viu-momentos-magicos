import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "./EventCard";
import ScrollReveal from "./ScrollReveal";
import { Flame, Camera } from "lucide-react";

interface FeaturedEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  photoCount: number;
  imageUrl: string;
  isLive?: boolean;
}

const FeaturedAlbums = () => {
  const [events, setEvents] = useState<FeaturedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
          .from("events")
          .select("id, name, event_date, location, cover_url, plan_type, created_at, status")
          .eq("visibility", true)
          .eq("status", "ativo")
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(50);

        if (error || !data) { setLoading(false); return; }

        const now = new Date();
        const scored = data.map((e) => {
          const createdAt = new Date(e.created_at);
          const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          let phaseScore = 0;
          if (daysSince <= 7) phaseScore = 10;
          else if (daysSince <= 30) phaseScore = 3;
          const planScore = e.plan_type === "profissional" ? 5 : 1;
          return { ...e, score: phaseScore * planScore + Math.random() * 2 };
        });

        scored.sort((a, b) => b.score - a.score);

        const proEvents = scored.filter((e) => e.plan_type === "profissional");
        const inicioEvents = scored.filter((e) => e.plan_type !== "profissional");
        const selected = [...proEvents.slice(0, 5), ...inicioEvents.slice(0, 3)].slice(0, 8);
        selected.sort(() => Math.random() - 0.5);

        const eventIds = selected.map((e) => e.id);
        const { data: photoCounts } = await supabase
          .from("event_photos")
          .select("event_id")
          .in("event_id", eventIds);

        const countMap: Record<string, number> = {};
        photoCounts?.forEach((p) => { countMap[p.event_id] = (countMap[p.event_id] || 0) + 1; });

        setEvents(selected.map((e) => ({
          id: e.id,
          title: e.name,
          date: new Date(e.event_date).toLocaleDateString("pt-BR"),
          location: e.location,
          photoCount: countMap[e.id] || 0,
          imageUrl: e.cover_url || "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80",
        })));
      } catch { /* silent */ } finally { setLoading(false); }
    };
    fetchFeatured();
  }, []);

  if (!loading && events.length === 0) {
    return (
      <ScrollReveal>
        <section className="mb-14">
          <div className="flex items-center gap-2 mb-6">
            <Flame className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Álbuns em Destaque</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Camera className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum evento disponível ainda</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Em breve você poderá explorar eventos e encontrar suas fotos aqui.
            </p>
            <a href="/cadastro-fotografo" className="text-sm font-medium text-primary hover:underline">
              Sou fotógrafo → publicar meu primeiro evento
            </a>
          </div>
        </section>
      </ScrollReveal>
    );
  }

  if (loading) {
    return (
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Álbuns em Destaque</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl shimmer-skeleton" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <ScrollReveal>
      <section className="mb-14">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Álbuns em Destaque</h2>
          </div>
          <button
            onClick={() => window.location.href = "/buscar"}
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {events.slice(0, 8).map((event, i) => (
            <ScrollReveal key={event.id} delay={i * 80}>
              <EventCard {...event} index={i} />
            </ScrollReveal>
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
};

export default FeaturedAlbums;
