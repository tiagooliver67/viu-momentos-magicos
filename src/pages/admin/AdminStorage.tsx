import { useEffect, useState, useMemo } from "react";
import { HardDrive, Image, Video, Users, Loader2, AlertTriangle, BarChart3, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const AdminStorage = () => {
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [{ data: ph }, { data: vi }, { data: ev }, { data: pr }] = await Promise.all([
        supabase.from("event_photos").select("id, event_id, created_at, photographer_id"),
        supabase.from("event_videos").select("id, event_id, created_at, photographer_id"),
        supabase.from("events").select("id, name, organizer_id, plan_type"),
        supabase.from("profiles").select("user_id, full_name"),
      ]);
      setPhotos(ph || []);
      setVideos(vi || []);
      setEvents(ev || []);
      setProfiles(pr || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const COST_PHOTO = 0.023;
  const COST_VIDEO = 0.26;
  const FREE_LIMIT = 20000;

  const photographerStats = useMemo(() => {
    const map = new Map<string, { photos: number; videos: number; name: string; events: number }>();
    const eventOwners = new Map<string, string>();
    events.forEach(e => eventOwners.set(e.id, e.organizer_id));

    photos.forEach(p => {
      const ownerId = p.photographer_id || eventOwners.get(p.event_id) || "unknown";
      const curr = map.get(ownerId) || { photos: 0, videos: 0, name: "", events: 0 };
      curr.photos++;
      map.set(ownerId, curr);
    });
    videos.forEach(v => {
      const ownerId = v.photographer_id || eventOwners.get(v.event_id) || "unknown";
      const curr = map.get(ownerId) || { photos: 0, videos: 0, name: "", events: 0 };
      curr.videos++;
      map.set(ownerId, curr);
    });

    // Count events per photographer
    events.forEach(e => {
      const curr = map.get(e.organizer_id);
      if (curr) curr.events++;
    });

    // Assign names
    map.forEach((val, key) => {
      const p = profiles.find(pr => pr.user_id === key);
      val.name = p?.full_name || key.slice(0, 8);
    });

    return Array.from(map.entries())
      .map(([id, data]) => {
        const totalFiles = data.photos + data.videos;
        const excedentePhotos = Math.max(0, data.photos - FREE_LIMIT);
        const excedenteVideos = data.videos;
        const estimatedCost = excedentePhotos * COST_PHOTO + excedenteVideos * COST_VIDEO;
        return { id, ...data, totalFiles, excedentePhotos, estimatedCost };
      })
      .sort((a, b) => b.totalFiles - a.totalFiles);
  }, [photos, videos, events, profiles]);

  const monthlyUploads = useMemo(() => {
    const now = new Date();
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const months: { month: string; fotos: number; videos: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const ph = photos.filter(p => { const c = new Date(p.created_at); return c >= d && c < nextD; }).length;
      const vi = videos.filter(v => { const c = new Date(v.created_at); return c >= d && c < nextD; }).length;
      months.push({ month: monthNames[d.getMonth()], fotos: ph, videos: vi });
    }
    return months;
  }, [photos, videos]);

  const totalPhotos = photos.length;
  const totalVideos = videos.length;
  const totalFiles = totalPhotos + totalVideos;
  const estimatedSize = (totalPhotos * 3 + totalVideos * 50) / 1024; // rough GB estimate

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Armazenamento S3</h1>
        <p className="text-sm text-muted-foreground">Monitoramento de uso do bucket viufoto-images-bucket (sa-east-1)</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <Image className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold">{totalPhotos.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Fotos</p>
        </div>
        <div className="glass-card p-4">
          <Video className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold">{totalVideos.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Vídeos</p>
        </div>
        <div className="glass-card p-4">
          <HardDrive className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold">~{estimatedSize.toFixed(1)} GB</p>
          <p className="text-xs text-muted-foreground">Espaço estimado</p>
        </div>
        <div className="glass-card p-4">
          <Users className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold">{photographerStats.length}</p>
          <p className="text-xs text-muted-foreground">Fotógrafos com uploads</p>
        </div>
      </div>

      {/* Upload chart */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Uploads por Mês (6 meses)</h3>
        {monthlyUploads.some(m => m.fotos > 0 || m.videos > 0) ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyUploads}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="fotos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Fotos" />
                <Bar dataKey="videos" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Vídeos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Nenhum upload registrado</div>
        )}
      </div>

      {/* Usage per photographer */}
      <div className="glass-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Consumo por Fotógrafo</h3>
          <p className="text-xs text-muted-foreground mt-1">Limite gratuito: {FREE_LIMIT.toLocaleString()} fotos | Excedente: R$ {COST_PHOTO}/foto, R$ {COST_VIDEO}/vídeo</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3 font-medium">Fotógrafo</th>
                <th className="text-right p-3 font-medium">Fotos</th>
                <th className="text-right p-3 font-medium">Vídeos</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">Eventos</th>
                <th className="text-right p-3 font-medium hidden md:table-cell">Excedente</th>
                <th className="text-right p-3 font-medium">Custo Est.</th>
                <th className="text-center p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {photographerStats.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-right">{p.photos.toLocaleString()}</td>
                  <td className="p-3 text-right">{p.videos.toLocaleString()}</td>
                  <td className="p-3 text-right hidden md:table-cell">{p.events}</td>
                  <td className="p-3 text-right hidden md:table-cell">
                    {p.excedentePhotos > 0 ? (
                      <span className="text-amber-500 font-medium">{p.excedentePhotos.toLocaleString()} fotos</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {p.estimatedCost > 0 ? (
                      <span className="text-primary">R$ {p.estimatedCost.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">R$ 0,00</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    {p.photos > FREE_LIMIT * 0.8 ? (
                      <span className="flex items-center justify-center gap-1 text-amber-500 text-xs font-semibold">
                        <AlertTriangle className="w-3 h-3" /> Alto uso
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {photographerStats.length === 0 && <p className="p-8 text-center text-muted-foreground text-sm">Nenhum upload encontrado</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminStorage;
