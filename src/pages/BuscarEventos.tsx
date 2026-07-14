import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, MapPin, Camera, User2 } from "lucide-react";
import { Link } from "react-router-dom";
import ClientNavbar from "@/components/ClientNavbar";
import Footer from "@/components/Footer";
import { getCoverUrl } from "@/lib/eventCover";

const BuscarEventos = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ["search-events", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) {
        const { data } = await supabase
          .from("events")
          .select("*")
          .eq("visibility", true)
          .order("event_date", { ascending: false })
          .limit(20);
        return data || [];
      }
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("visibility", true)
        .ilike("name", `%${searchTerm}%`)
        .order("event_date", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: photographers } = useQuery({
    queryKey: ["search-photographers", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      const { data } = await supabase
        .from("photographer_sites_public" as any)
        .select("*")
        .ilike("display_name", `%${searchTerm}%`)
        .limit(10);
      return data || [];
    },
    enabled: !!searchTerm.trim(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(query);
    setSearchParams(query ? { q: query } : {});
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ClientNavbar />
      <main className="flex-1 pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Buscar Eventos</h1>

          <form onSubmit={handleSearch} className="flex gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Nome do evento ou fotógrafo..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
            <button type="submit" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all">
              Buscar
            </button>
          </form>

          {/* Photographers Results */}
          {photographers && photographers.length > 0 && (
            <section className="mb-10">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <User2 className="w-5 h-5 text-primary" /> Fotógrafos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {photographers.map((p: any) => (
                  <Link
                    key={p.id}
                    to={`/fotografo/${p.slug}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all"
                  >
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Camera className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-foreground text-sm">{p.display_name || "Fotógrafo"}</p>
                      {p.bio && <p className="text-xs text-muted-foreground line-clamp-1">{p.bio}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Events Results */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Eventos
            </h2>
            {loadingEvents ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !events || events.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum evento encontrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {events.map((event: any) => (
                  <Link
                    key={event.id}
                    to={`/evento/${event.id}`}
                    className="group rounded-xl overflow-hidden border border-border bg-card hover:border-primary/30 transition-all"
                  >
                    <div className="aspect-[16/10] overflow-hidden bg-secondary/30">
                      {event.cover_url ? (
                        <img src={getCoverUrl(event.cover_url, 600) ?? undefined} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-sm line-clamp-2 text-foreground">{event.name}</h3>
                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(event.event_date).toLocaleDateString("pt-BR")}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BuscarEventos;
