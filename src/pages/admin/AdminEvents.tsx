import { useState } from "react";
import { Search, CheckCircle, XCircle, Eye, Clock, Camera, MapPin } from "lucide-react";

const mockEvents = [
  { id: 1, title: "VERÃO RUN IRECÊ 2026", photographer: "Carlos Silva", date: "22/03/2026", location: "Irecê, BA", photos: 2615, status: "live", revenue: "R$ 8.450", moderation: "approved" },
  { id: 2, title: "CORRIDA DO SIMTRANS", photographer: "Ana Costa", date: "24/03/2026", location: "Salvador, BA", photos: 1830, status: "live", revenue: "R$ 5.200", moderation: "approved" },
  { id: 3, title: "IL RUN EXPERIENCE", photographer: "Roberto Lima", date: "22/03/2026", location: "V. Conquista, BA", photos: 3200, status: "processing", revenue: "R$ 0", moderation: "pending" },
  { id: 4, title: "ECO RUN 2026", photographer: "Marina Santos", date: "28/03/2026", location: "Camaçari, BA", photos: 0, status: "upcoming", revenue: "R$ 0", moderation: "pending" },
  { id: 5, title: "PEDAL DA CIDADE", photographer: "Paulo Oliveira", date: "29/03/2026", location: "Salvador, BA", photos: 0, status: "upcoming", revenue: "R$ 0", moderation: "approved" },
  { id: 6, title: "NIGHT RUN SPECIAL", photographer: "Carlos Silva", date: "15/03/2026", location: "Lauro de Freitas, BA", photos: 4100, status: "completed", revenue: "R$ 12.800", moderation: "approved" },
];

const statusBadge: Record<string, string> = {
  live: "badge-live",
  processing: "bg-amber-500/15 text-amber-500 px-2 py-1 rounded-full text-xs font-semibold",
  upcoming: "bg-accent/15 text-accent px-2 py-1 rounded-full text-xs font-semibold",
  completed: "bg-lime/15 text-lime px-2 py-1 rounded-full text-xs font-semibold",
};

const AdminEvents = () => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = mockEvents.filter((e) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "all" || e.status === tab;
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Eventos</h1>
        <p className="text-sm text-muted-foreground">Moderação e acompanhamento de eventos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "Todos" },
          { key: "live", label: "🔴 Ao Vivo" },
          { key: "upcoming", label: "📅 Próximos" },
          { key: "processing", label: "⏳ Processando" },
          { key: "completed", label: "✅ Finalizados" },
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((event) => (
          <div key={event.id} className="glass-card-hover p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm">{event.title}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" /> {event.location}
                </p>
              </div>
              <span className={statusBadge[event.status]}>
                {event.status === "live" ? "AO VIVO" : event.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-sm font-bold">{event.photos}</p>
                <p className="text-[10px] text-muted-foreground">Fotos</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-sm font-bold">{event.revenue}</p>
                <p className="text-[10px] text-muted-foreground">Receita</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-2">
                <p className="text-sm font-bold">{event.date}</p>
                <p className="text-[10px] text-muted-foreground">Data</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>📸 {event.photographer}</span>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-lime/15 transition-colors" title="Aprovar">
                  <CheckCircle className="w-4 h-4 text-lime" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-destructive/15 transition-colors" title="Reprovar">
                  <XCircle className="w-4 h-4 text-destructive" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Ver detalhes">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminEvents;
