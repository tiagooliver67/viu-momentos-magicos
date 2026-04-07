import { useEffect, useState } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EventData {
  id: string;
  name: string;
  location: string;
  event_date: string;
  status: string;
  category: string;
  photoCount: number;
  revenue: number;
}

const statusBadge: Record<string, string> = {
  ativo: "bg-lime/15 text-lime px-2 py-1 rounded-full text-xs font-semibold",
  em_breve: "bg-accent/15 text-accent px-2 py-1 rounded-full text-xs font-semibold",
  inativo: "bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs font-semibold",
};

const statusLabel: Record<string, string> = {
  ativo: "Ativo",
  em_breve: "Em Breve",
  inativo: "Inativo",
};

const AdminEvents = () => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const [{ data: eventsRaw }, { data: photos }, { data: orders }] = await Promise.all([
        supabase.from("events").select("id, name, location, event_date, status, category"),
        supabase.from("event_photos").select("id, event_id"),
        supabase.from("orders").select("event_id, amount, status").eq("status", "pago"),
      ]);

      if (eventsRaw) {
        const mapped: EventData[] = eventsRaw.map(e => ({
          id: e.id,
          name: e.name,
          location: e.location,
          event_date: e.event_date,
          status: e.status,
          category: e.category,
          photoCount: photos?.filter(p => p.event_id === e.id).length || 0,
          revenue: orders?.filter(o => o.event_id === e.id).reduce((s, o) => s + Number(o.amount), 0) || 0,
        }));
        setEvents(mapped);
      }
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const filtered = events.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || e.status === tab;
    return matchSearch && matchTab;
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Eventos</h1>
        <p className="text-sm text-muted-foreground">{events.length} eventos cadastrados</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "Todos" },
          { key: "ativo", label: "Ativos" },
          { key: "em_breve", label: "Em Breve" },
          { key: "inativo", label: "Inativos" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar evento..." className="bg-transparent text-sm outline-none w-full" />
        </div>
      </div>

      {/* Events grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((event) => (
            <div key={event.id} className="glass-card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm">{event.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {event.location}
                  </p>
                </div>
                <span className={statusBadge[event.status] || "bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs font-semibold"}>
                  {statusLabel[event.status] || event.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-sm font-bold">{event.photoCount}</p>
                  <p className="text-[10px] text-muted-foreground">Fotos</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-sm font-bold">{fmt(event.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">Receita</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-2">
                  <p className="text-sm font-bold">{new Date(event.event_date).toLocaleDateString("pt-BR")}</p>
                  <p className="text-[10px] text-muted-foreground">Data</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <p className="text-sm">Nenhum evento encontrado</p>
        </div>
      )}
    </div>
  );
};

export default AdminEvents;
