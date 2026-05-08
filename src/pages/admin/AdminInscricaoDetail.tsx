import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, ExternalLink, Search, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatBRL, STATUS_LABEL, type RegistrationEvent, type EventRegistration } from "@/lib/inscricoes";

function logAction(performed_by: string, target_user_id: string, action: string, details: any) {
  return supabase.from("admin_audit_log").insert({ performed_by, target_user_id, action, details });
}

export default function AdminInscricaoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<RegistrationEvent | null>(null);
  const [organizerName, setOrganizerName] = useState<string | null>(null);
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [loadingProof, setLoadingProof] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [evRes, regRes] = await Promise.all([
        supabase.from("registration_events").select("*").eq("id", id).single(),
        supabase.from("event_registrations").select("*").eq("registration_event_id", id).order("created_at", { ascending: false }),
      ]);
      setEvent(evRes.data);
      setRegs(regRes.data ?? []);
      if (evRes.data?.organizer_id) {
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", evRes.data.organizer_id).single();
        setOrganizerName(prof?.full_name ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

  const openProof = async (value: string) => {
    if (/^https?:\/\//i.test(value)) { setProofPreview(value); return; }
    setLoadingProof(true);
    const { data, error } = await supabase.storage.from("registration-assets").createSignedUrl(value, 3600);
    setLoadingProof(false);
    if (error || !data?.signedUrl) return toast.error("Não foi possível abrir o comprovante");
    setProofPreview(data.signedUrl);
  };

  const setPayment = async (regId: string, status: "pago" | "pendente") => {
    const reg = regs.find((r) => r.id === regId);
    const { error } = await supabase.from("event_registrations").update({ payment_status: status }).eq("id", regId);
    if (error) return toast.error(error.message);
    setRegs((p) => p.map((r) => (r.id === regId ? { ...r, payment_status: status } : r)));
    if (user && event) {
      await logAction(user.id, event.organizer_id, "registration_payment_update", {
        registration_id: regId, event_id: event.id, new_status: status, athlete: reg?.full_name,
      });
    }
    toast.success(`Pagamento marcado como ${status}`);
  };

  const cancelReg = async (regId: string) => {
    if (!confirm("Cancelar esta inscrição? Esta ação será registrada no log de auditoria.")) return;
    const reg = regs.find((r) => r.id === regId);
    const { error } = await supabase.from("event_registrations").delete().eq("id", regId);
    if (error) return toast.error(error.message);
    setRegs((p) => p.filter((r) => r.id !== regId));
    if (user && event) {
      await logAction(user.id, event.organizer_id, "registration_cancelled", {
        registration_id: regId, event_id: event.id, athlete: reg?.full_name, email: reg?.email,
      });
    }
    toast.success("Inscrição cancelada");
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!event) return <div className="p-8">Evento não encontrado</div>;

  const filtered = regs.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.full_name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s) || (r.cpf ?? "").includes(s);
  });

  const arrecadado = regs.filter((r) => r.payment_status === "pago").reduce((a, r) => a + Number(r.amount_due ?? 0), 0);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/admin/inscricoes")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Badge variant={event.status === "aberto" ? "default" : "secondary"} className="mb-1">{STATUS_LABEL[event.status]}</Badge>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mt-1">
            <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(event.event_date)}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {event.location}</span>
            <span>Organizador: <Link to={`/admin/usuarios?user=${event.organizer_id}`} className="text-primary hover:underline">{organizerName ?? event.organizer_id.slice(0, 8)}</Link></span>
          </div>
        </div>
        <a href={`/inscricao/${event.slug}`} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
          <ExternalLink className="w-4 h-4" /> Página pública
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total" value={regs.length} />
        <Stat label="Pagos" value={regs.filter((r) => r.payment_status === "pago").length} accent="text-green-500" />
        <Stat label="Pendentes" value={regs.filter((r) => r.payment_status === "pendente").length} accent="text-amber-500" />
        <Stat label="Arrecadado" value={formatBRL(arrecadado)} accent="text-primary" />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar nome, e-mail ou CPF" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Contato</th>
              <th className="text-left p-3">CPF</th>
              <th className="text-left p-3">Categoria</th>
              <th className="text-left p-3">Pagamento</th>
              <th className="text-left p-3">Comprovante</th>
              <th className="text-left p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{r.full_name}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  <div>{r.email}</div>
                  <div>{r.phone}</div>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{r.cpf ?? "—"}</td>
                <td className="p-3 text-xs">{r.category ?? "—"}</td>
                <td className="p-3"><Badge variant={r.payment_status === "pago" ? "default" : "secondary"}>{STATUS_LABEL[r.payment_status]}</Badge></td>
                <td className="p-3">
                  {r.payment_proof_url ? (
                    <button onClick={() => openProof(r.payment_proof_url!)} disabled={loadingProof} className="text-xs text-primary hover:underline disabled:opacity-50">{loadingProof ? "..." : "Ver"}</button>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="p-3 flex gap-1">
                  {r.payment_status === "pago" ? (
                    <Button size="sm" variant="outline" onClick={() => setPayment(r.id, "pendente")}>Pendente</Button>
                  ) : (
                    <Button size="sm" onClick={() => setPayment(r.id, "pago")}>Marcar pago</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => cancelReg(r.id)} className="text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum inscrito</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!proofPreview} onOpenChange={(o) => !o && setProofPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Comprovante de pagamento</DialogTitle></DialogHeader>
          {proofPreview && (
            proofPreview.toLowerCase().includes(".pdf") ? (
              <iframe src={proofPreview} className="w-full h-[70vh]" title="Comprovante" />
            ) : (
              <img src={proofPreview} alt="Comprovante" className="max-h-[70vh] mx-auto rounded-lg" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}