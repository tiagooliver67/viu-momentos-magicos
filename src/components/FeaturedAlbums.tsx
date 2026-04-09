import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import EventCard from "./EventCard";
import { Flame } from "lucide-react";

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
        // Fetch visible, active events created within 30 days
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

        if (error || !data) {
          setLoading(false);
          return;
        }

        // Score and sort by plan + phase
        const now = new Date();
        const scored = data.map((e) => {
          const createdAt = new Date(e.created_at);
          const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

          let phaseScore = 0;
          if (daysSince <= 7) phaseScore = 10;
          else if (daysSince <= 30) phaseScore = 3;

          const planScore = e.plan_type === "profissional" ? 5 : 1;
          const randomJitter = Math.random() * 2;

          return {
            ...e,
            score: phaseScore * planScore + randomJitter,
          };
        });

        scored.sort((a, b) => b.score - a.score);

        // Pick up to 8: prefer 5 pro + 3 inicio
        const proEvents = scored.filter((e) => e.plan_type === "profissional");
        const inicioEvents = scored.filter((e) => e.plan_type !== "profissional");

        const selected = [
          ...proEvents.slice(0, 5),
          ...inicioEvents.slice(0, 3),
        ].slice(0, 8);

        // Shuffle slightly for variety
        selected.sort(() => Math.random() - 0.5);

        // Fetch photo counts
        const eventIds = selected.map((e) => e.id);
        const { data: photoCounts } = await supabase
          .from("event_photos")
          .select("event_id")
          .in("event_id", eventIds);

        const countMap: Record<string, number> = {};
        photoCounts?.forEach((p) => {
          countMap[p.event_id] = (countMap[p.event_id] || 0) + 1;
        });

        const mapped: FeaturedEvent[] = selected.map((e) => ({
          id: e.id,
          title: e.name,
          date: new Date(e.event_date).toLocaleDateString("pt-BR"),
          location: e.location,
          photoCount: countMap[e.id] || 0,
          imageUrl: e.cover_url || "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80",
        }));

        setEvents(mapped);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  // Show mock data if no real events
  const mockFeatured: FeaturedEvent[] = [
    { id: "1", title: "VERÃO RUN IRECÊ 2026", date: "22/03/2026", location: "Irecê, BA", photoCount: 2615, imageUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80", isLive: true },
    { id: "2", title: "CORRIDA DO SIMTRANS", date: "24/03/2026", location: "Salvador, BA", photoCount: 1830, imageUrl: "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80" },
    { id: "3", title: "IL RUN EXPERIENCE", date: "22/03/2026", location: "Vitória da Conquista, BA", photoCount: 3200, imageUrl: "https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=600&q=80" },
    { id: "4", title: "CORRIDA TRILHA", date: "22/03/2026", location: "Alagoinhas, BA", photoCount: 945, imageUrl: "https://images.unsplash.com/photo-1486218119243-13883505764c?w=600&q=80" },
    { id: "5", title: "Tic Tac e Tri Swim", date: "18/03/2026", location: "Salvador, BA", photoCount: 1200, imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&q=80" },
    { id: "6", title: "DMTB 26 DESAFIO", date: "10/03/2026", location: "Mato de São João, BA", photoCount: 890, imageUrl: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=600&q=80" },
    { id: "7", title: "MARATONA SALVADOR", date: "15/03/2026", location: "Salvador, BA", photoCount: 4100, imageUrl: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80" },
    { id: "8", title: "PEDAL NORDESTE", date: "08/03/2026", location: "Recife, PE", photoCount: 560, imageUrl: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=600&q=80" },
  ];

  const displayEvents = events.length > 0 ? events : mockFeatured;

  if (loading) {
    return (
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-6">
          <Flame className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Álbuns em Destaque</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
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
        {displayEvents.slice(0, 8).map((event) => (
          <EventCard key={event.id} {...event} />
        ))}
      </div>
    </section>
  );
};

export default FeaturedAlbums;
