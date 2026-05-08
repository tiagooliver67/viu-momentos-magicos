import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Users2, ExternalLink, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate, STATUS_LABEL } from "@/lib/inscricoes";

type Row = {
  id: string;
  name: string;
  slug: string;
  status: string;
  event_date: string;
  location: string;
  organizer_id: string;
  organizer_name: string | null;
  total: number;
  pagos: number;
  pendentes: number;
  arrecadado: number;
};

export default function AdminInscricoes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data: events } = await supabase
        .from("registration_events")
        .select("id, name, slug, status, event_date, location, organizer_id")
        .order("event_date", { ascending: false });

      const eventList = events ?? [];
      const organizerIds = [...new Set(eventList.map((e) => e.organizer_id))];
      const ids = eventList.map((e) => e.id);

      const [profilesRes, regsRes] = await Promise.all([
        organizerIds.length
          ? supabase.from("profiles").select("user_id, full_name").in("user_id", organizerIds)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase
              .from("event_registrations")
              .select("registration_event_id, payment_status, amount_due")
              .in("registration_event_id", ids)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p.full_name]));
      const stats = new Map<string, { total: number; pagos: number; pendentes: number; arrecadado: number }>();
      (regsRes.data ?? []).forEach((r: any) => {
        const s = stats.get(r.registration_event_id) ?? { total: 0, pagos: 0, pendentes: 0, arrecadado: 0 };
        s.total++;
        if (r.payment_status === "pago") {
          s.pagos++;
          s.arrecadado += Number(r.amount_due ?? 0);
        } else if (r.payment_status === "pendente") s.pendentes++;
        stats.set(r.registration_event_id, s);
      });

      setRows(
        eventList.map((e) => ({
          ...e,
          organizer_name: (profMap.get(e.organizer_id) as string) ?? null,
          ...(stats.get(e.id) ?? { total: 0, pagos: 0, pendentes: 0, arrecadado: 0 }),
        })),
      );
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(s) ||
      r.location.toLowerCase().includes(s) ||
      (r.organizer_name ?? "").toLowerCase().includes(s)
    );
  });

  const totalGlobal = rows.reduce((a, r) => a + r.total, 0);
  const arrGlobal = rows.reduce((a, r) => a + r.arrecadado, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inscrições</h1>
        <p className="text-sm text-muted-foreground">Todos os eventos de inscrição da plataforma</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Eventos" value={rows.length} />
        <KPI label="Inscritos totais" value={totalGlobal} />
        <KPI label="Pagos" value={rows.reduce((a, r) => a + r.pagos, 0)} accent="text-green-500" />
        <KPI label="Arrecadado" value={arrGlobal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} accent="text-primary" />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar evento, organizador ou cidade" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">Nenhum evento de inscrição encontrado</p>
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left p-3">Evento</th>
                <th className="text-left p-3">Organizador</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Data</th>
                <th className="text-right p-3">Inscritos</th>
                <th className="text-right p-3">Pagos</th>
                <th className="text-right p-3">Pendentes</th>
                <th className="text-right p-3">Arrecadado</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="p-3">
                    <Link to={`/admin/inscricoes/${r.id}`} className="font-medium hover:text-primary">{r.name}</Link>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.location}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.organizer_name ?? "—"}</td>
                  <td className="p-3"><Badge variant={r.status === "aberto" ? "default" : "secondary"}>{STATUS_LABEL[r.status as keyof typeof STATUS_LABEL] ?? r.status}</Badge></td>
                  <td className="p-3 text-muted-foreground">{formatDate(r.event_date)}</td>
                  <td className="p-3 text-right font-medium">{r.total}</td>
                  <td className="p-3 text-right text-green-500">{r.pagos}</td>
                  <td className="p-3 text-right text-amber-500">{r.pendentes}</td>
                  <td className="p-3 text-right">{r.arrecadado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                  <td className="p-3 text-right">
                    <a href={`/inscricao/${r.slug}`} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}