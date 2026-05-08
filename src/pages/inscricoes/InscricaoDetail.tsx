import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users2, Copy, ExternalLink, Search, Check, Edit, FileSpreadsheet, FileText, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { formatDate, formatBRL, STATUS_LABEL, type RegistrationEvent, type EventRegistration, type RegistrationCategory } from "@/lib/inscricoes";

export default function InscricaoDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [event, setEvent] = useState<RegistrationEvent | null>(null);
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [categories, setCategories] = useState<RegistrationCategory[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideCheckedIn, setHideCheckedIn] = useState(true);
  const [checkinSearch, setCheckinSearch] = useState("");

  const reload = async () => {
    if (!id) return;
    const [evRes, regRes, catRes] = await Promise.all([
      supabase.from("registration_events").select("*").eq("id", id).single(),
      supabase.from("event_registrations").select("*").eq("registration_event_id", id).order("created_at", { ascending: false }),
      supabase.from("registration_categories").select("*").eq("registration_event_id", id).order("sort_order"),
    ]);
    setEvent(evRes.data);
    setRegs(regRes.data ?? []);
    setCategories(catRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [id]);

  const stats = useMemo(() => {
    const pagos = regs.filter((r) => r.payment_status === "pago").length;
    const pendentes = regs.filter((r) => r.payment_status === "pendente").length;
    const presentes = regs.filter((r) => r.checkin_status === "presente").length;
    const arrecadacaoPrevista = regs.reduce((acc, r) => acc + Number(r.amount_due ?? 0), 0);
    const arrecadacaoReal = regs.filter((r) => r.payment_status === "pago")
      .reduce((acc, r) => acc + Number(r.amount_due ?? 0), 0);
    // top modalidade
    const counts: Record<string, number> = {};
    regs.forEach((r) => {
      const key = r.category_id
        ? categories.find((c) => c.id === r.category_id)?.name ?? r.category ?? "—"
        : r.category ?? "—";
      if (key && key !== "—") counts[key] = (counts[key] ?? 0) + 1;
    });
    const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const topModalidade = topEntry ? `${topEntry[0]} (${topEntry[1]})` : "—";
    return { total: regs.length, pagos, pendentes, presentes, arrecadacaoPrevista, arrecadacaoReal, topModalidade };
  }, [regs, categories]);

  const publicUrl = event ? `${window.location.origin}/inscricao/${event.slug}` : "";

  const filteredRegs = regs.filter((r) => {
    if (filterStatus !== "all" && r.payment_status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.full_name.toLowerCase().includes(s) && !r.email.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const checkinList = regs.filter((r) => {
    if (hideCheckedIn && r.checkin_status === "presente") return false;
    if (checkinSearch) {
      const s = checkinSearch.toLowerCase();
      return r.full_name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s) || r.phone.includes(s);
    }
    return true;
  });

  const setPayment = async (regId: string, status: "pago" | "pendente") => {
    await supabase.from("event_registrations").update({ payment_status: status }).eq("id", regId);
    setRegs((p) => p.map((r) => (r.id === regId ? { ...r, payment_status: status } : r)));
  };

  const setCheckin = async (regId: string) => {
    await supabase
      .from("event_registrations")
      .update({ checkin_status: "presente", checked_in_at: new Date().toISOString() })
      .eq("id", regId);
    setRegs((p) => p.map((r) => (r.id === regId ? { ...r, checkin_status: "presente", checked_in_at: new Date().toISOString() } : r)));
    toast.success("Check-in confirmado");
  };

  const exportCSV = () => {
    const cols = ["Nome", "Email", "Telefone", "Cidade", "Data Nasc.", "Categoria", "Camiseta", "Pagamento", "Check-in", "Inscrito em"];
    const rows = regs.map((r) => [r.full_name, r.email, r.phone, r.city ?? "", r.birth_date ?? "", r.category ?? "", r.shirt_size ?? "", r.payment_status, r.checkin_status, new Date(r.created_at).toLocaleString("pt-BR")]);
    const csv = [cols, ...rows].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscritos-${event?.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(regs.map((r) => ({
      Nome: r.full_name, Email: r.email, Telefone: r.phone, Cidade: r.city ?? "",
      "Data Nasc.": r.birth_date ?? "", Categoria: r.category ?? "", Camiseta: r.shirt_size ?? "",
      Pagamento: r.payment_status, "Check-in": r.checkin_status,
      "Inscrito em": new Date(r.created_at).toLocaleString("pt-BR"),
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inscritos");
    XLSX.writeFile(wb, `inscritos-${event?.slug}.xlsx`);
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(event?.name ?? "Evento", 14, 16);
    doc.setFontSize(10);
    doc.text(`${formatDate(event?.event_date ?? "")} - ${event?.location ?? ""}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Nome", "Telefone", "Categoria", "Pagamento", "Check-in"]],
      body: regs.map((r) => [r.full_name, r.phone, r.category ?? "-", r.payment_status, r.checkin_status]),
      styles: { fontSize: 9 },
    });
    doc.save(`inscritos-${event?.slug}.pdf`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!event) return <div className="p-8">Evento não encontrado</div>;

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar />
      <main className="flex-1 p-4 md:p-8 pt-20 lg:pt-8">
        <button onClick={() => navigate("/dashboard/inscricoes")} className="flex items-center gap-2 text-sm text-muted-foreground mb-3 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={event.status === "aberto" ? "default" : "secondary"}>{STATUS_LABEL[event.status]}</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-black">{event.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(event.event_date)}{event.event_time ? ` • ${event.event_time.slice(0, 5)}` : ""}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {event.location}</span>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(`/dashboard/inscricoes/${event.id}/editar`)} className="gap-2">
            <Edit className="w-4 h-4" /> Editar
          </Button>
        </div>

        <Tabs defaultValue="visao">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="visao">Visão geral</TabsTrigger>
            <TabsTrigger value="inscritos">Inscritos ({stats.total})</TabsTrigger>
            <TabsTrigger value="checkin">Check-in</TabsTrigger>
            <TabsTrigger value="link">Link & QR</TabsTrigger>
          </TabsList>

          <TabsContent value="visao" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="Total inscritos" value={stats.total} sub={`${stats.pagos} pagos · ${stats.pendentes} pendentes`} />
              <KPI label="Arrecadação prevista" value={formatBRL(stats.arrecadacaoPrevista)} accent="text-foreground" />
              <KPI label="Arrecadação real" value={formatBRL(stats.arrecadacaoReal)} accent="text-green-500" sub="Apenas pagamentos confirmados" />
              <KPI label="Top modalidade" value={stats.topModalidade} accent="text-primary" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPI label="Pagos" value={stats.pagos} accent="text-green-500" />
              <KPI label="Pendentes" value={stats.pendentes} accent="text-amber-500" />
              <KPI label="Check-ins" value={stats.presentes} accent="text-primary" />
            </div>
          </TabsContent>

          <TabsContent value="inscritos" className="mt-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pago">Pagos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1"><FileText className="w-4 h-4" /> CSV</Button>
              <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1"><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
              <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1"><FileText className="w-4 h-4" /> PDF</Button>
            </div>

            <div className="glass-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Nome</th>
                    <th className="text-left p-3">Contato</th>
                    <th className="text-left p-3">Documentos</th>
                    <th className="text-left p-3">Categoria</th>
                    <th className="text-left p-3">Pagamento</th>
                    <th className="text-left p-3">Comprovante</th>
                    <th className="text-left p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegs.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="p-3 font-medium">{r.full_name}</td>
                      <td className="p-3 text-muted-foreground">
                        <div className="text-xs">{r.email}</div>
                        {r.phone && (
                          <a
                            href={`https://wa.me/55${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Olá ${firstName(r.full_name)}, aqui é ${profile?.full_name ?? "o organizador"}, organizador do evento *${event.name}*.`,
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline mt-0.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> {formatPhone(r.phone)}
                          </a>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {r.cpf && <div>CPF {formatCPF(r.cpf)}</div>}
                        {r.birth_date && <div>Nasc. {formatDate(r.birth_date)}</div>}
                        {!r.cpf && !r.birth_date && <span>—</span>}
                      </td>
                      <td className="p-3 text-xs">
                        <div className="font-medium text-sm text-foreground">{r.category ?? "-"}</div>
                        {r.team && <div className="text-muted-foreground">Equipe: {r.team}</div>}
                        {r.shirt_size && <div className="text-muted-foreground">Camiseta: {r.shirt_size}</div>}
                      </td>
                      <td className="p-3">
                        <Badge variant={r.payment_status === "pago" ? "default" : "secondary"}>{STATUS_LABEL[r.payment_status]}</Badge>
                      </td>
                      <td className="p-3">
                        {r.payment_proof_url ? (
                          <button onClick={() => setProofPreview(r.payment_proof_url!)} className="text-xs text-primary hover:underline">Ver</button>
                        ) : (<span className="text-xs text-muted-foreground">—</span>)}
                      </td>
                      <td className="p-3">
                        {r.payment_status === "pago" ? (
                          <Button size="sm" variant="outline" onClick={() => setPayment(r.id, "pendente")}>Marcar pendente</Button>
                        ) : (
                          <Button size="sm" onClick={() => setPayment(r.id, "pago")}>Marcar pago</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredRegs.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum inscrito ainda</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="checkin" className="mt-4 space-y-3">
            <div className="flex items-center gap-2 sticky top-14 lg:top-0 bg-background py-2 z-10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar inscrito" value={checkinSearch} onChange={(e) => setCheckinSearch(e.target.value)} className="pl-9 h-12 text-base" />
              </div>
              <Button variant={hideCheckedIn ? "default" : "outline"} size="sm" onClick={() => setHideCheckedIn(!hideCheckedIn)}>
                {hideCheckedIn ? "Ocultar presentes" : "Mostrar todos"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{stats.presentes} de {stats.total} presentes</p>
            <div className="space-y-2">
              {checkinList.map((r) => (
                <div key={r.id} className="glass-card p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.category ?? "-"} • <Badge variant={r.payment_status === "pago" ? "default" : "secondary"} className="ml-1">{STATUS_LABEL[r.payment_status]}</Badge></p>
                  </div>
                  {r.checkin_status === "presente" ? (
                    <Badge className="gap-1 h-12"><Check className="w-4 h-4" /> Presente</Badge>
                  ) : (
                    <Button onClick={() => setCheckin(r.id)} className="h-12 px-6 gap-2"><Check className="w-5 h-5" /> Presente</Button>
                  )}
                </div>
              ))}
              {checkinList.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum inscrito encontrado</p>}
            </div>
          </TabsContent>

          <TabsContent value="link" className="mt-4">
            <div className="glass-card p-5 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Link público de inscrição</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={publicUrl} />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success("Copiado"); }}><Copy className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" asChild><a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>
                </div>
                {event.status === "rascunho" && <p className="text-xs text-amber-500 mt-2">⚠ Evento em rascunho — publique para receber inscrições.</p>}
              </div>
              <div className="flex flex-col items-center gap-2 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">QR Code do link</p>
                <div className="bg-white p-4 rounded-lg">
                  <QRCodeSVG value={publicUrl} size={200} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!proofPreview} onOpenChange={() => setProofPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Comprovante de pagamento</DialogTitle></DialogHeader>
          {proofPreview && (
            proofPreview.endsWith(".pdf") ? (
              <iframe src={proofPreview} className="w-full h-[70vh]" />
            ) : (
              <img src={proofPreview} alt="Comprovante" className="w-full max-h-[70vh] object-contain" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPI({ label, value, accent, sub }: { label: string; value: number | string; accent?: string; sub?: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-black mt-1 ${accent ?? ""}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function firstName(full: string): string {
  return (full ?? "").trim().split(/\s+/)[0] ?? "";
}

function formatCPF(raw: string): string {
  const d = (raw ?? "").replace(/\D/g, "").padStart(11, "0").slice(-11);
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(raw: string): string {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}