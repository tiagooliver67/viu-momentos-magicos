import { useEffect, useState } from "react";
import { Info, Loader2, Paperclip, Mail, Shield, CheckCircle2, AlertTriangle, ExternalLink, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Ticket = {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  category: string;
  subject: string;
  message: string;
  attachment_url: string | null;
  status: string;
  admin_response: string | null;
  created_at: string;
  resolved_at: string | null;
  assigned_photographer_id: string | null;
  photo_url: string | null;
  escalate_after: string | null;
};

const STATUS_FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "escalados", label: "Escalados" },
  { value: "aberto", label: "Abertos" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "resolvido", label: "Resolvidos" },
];

const AdminSupport = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar tickets", description: error.message, variant: "destructive" });
    setTickets((data as Ticket[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setAttachmentUrl(null);
    if (!selected?.attachment_url) return;
    supabase.storage.from("support-attachments").createSignedUrl(selected.attachment_url, 3600).then(({ data }) => {
      if (data?.signedUrl) setAttachmentUrl(data.signedUrl);
    });
    setResponse(selected.admin_response ?? "");
  }, [selected]);

  const isEscalated = (t: Ticket) =>
    !!t.assigned_photographer_id && !!t.escalate_after && new Date(t.escalate_after).getTime() < Date.now() && t.status !== "resolvido";

  const visible = tickets.filter((t) =>
    filter === "todos" ? true : filter === "escalados" ? isEscalated(t) : t.status === filter,
  );

  const updateStatus = async (status: string) => {
    if (!selected) return;
    setSaving(true);
    const payload: any = { status, admin_response: response || null };
    if (status === "resolvido") payload.resolved_at = new Date().toISOString();
    const { error } = await (supabase as any).from("support_tickets").update(payload).eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Ticket atualizado" });
    setSelected(null);
    load();
  };

  const counts = {
    aberto: tickets.filter((t) => t.status === "aberto").length,
    em_andamento: tickets.filter((t) => t.status === "em_andamento").length,
    resolvido: tickets.filter((t) => t.status === "resolvido").length,
    escalados: tickets.filter(isEscalated).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Suporte</h1>
          <p className="text-sm text-muted-foreground">Tickets de privacidade, LGPD e atendimento ao usuário</p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">Escalados: {counts.escalados}</span>
          <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">Abertos: {counts.aberto}</span>
          <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">Em andamento: {counts.em_andamento}</span>
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Resolvidos: {counts.resolvido}</span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filter === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card p-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Info className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Nenhum ticket encontrado</h3>
          <p className="text-sm text-muted-foreground">Quando usuários abrirem solicitações via Central de Ajuda, aparecerão aqui.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Usuário</th>
                <th className="text-left p-3">Assunto</th>
                <th className="text-left p-3">Categoria</th>
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} onClick={() => setSelected(t)} className={`border-t border-border hover:bg-secondary/40 cursor-pointer ${isEscalated(t) ? "bg-red-500/5" : ""}`}>
                  <td className="p-3">
                    <div className="font-medium">{t.user_name || "—"}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{t.user_email}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      {isEscalated(t) && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 border border-red-500/30 font-bold uppercase">
                          <AlertTriangle className="w-3 h-3" /> URGENTE — fotógrafo não respondeu
                        </span>
                      )}
                      {t.assigned_photographer_id && !isEscalated(t) && t.status !== "resolvido" && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
                          <UserCheck className="w-3 h-3" /> Com fotógrafo
                        </span>
                      )}
                      {t.attachment_url && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                      {t.subject}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3" />{t.category}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{selected.category}</div>
                <h2 className="text-lg font-bold">{selected.subject}</h2>
                <div className="text-sm text-muted-foreground mt-1">
                  {selected.user_name || "—"} · {selected.user_email}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString("pt-BR")}</div>
              </div>
              <StatusBadge status={selected.status} />
            </div>
            <div className="p-5 space-y-4">
              {selected.assigned_photographer_id && (
                <div className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${isEscalated(selected) ? "border-red-500/30 bg-red-500/5 text-red-700" : "border-blue-500/20 bg-blue-500/5 text-blue-700"}`}>
                  {isEscalated(selected) ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <UserCheck className="w-4 h-4 shrink-0" />}
                  <span>
                    {isEscalated(selected)
                      ? "O fotógrafo responsável não respondeu dentro de 24h. Ação manual do Super Admin necessária."
                      : `Chamado em poder do fotógrafo. Prazo até ${selected.escalate_after ? new Date(selected.escalate_after).toLocaleString("pt-BR") : "—"}.`}
                  </span>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">MENSAGEM DO USUÁRIO</div>
                <div className="p-4 rounded-lg bg-background border border-border whitespace-pre-wrap text-sm">{selected.message}</div>
              </div>
              {selected.photo_url && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">FOTO REFERIDA</div>
                  <a href={selected.photo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline break-all">
                    <ExternalLink className="w-4 h-4 shrink-0" /> {selected.photo_url}
                  </a>
                </div>
              )}
              {selected.attachment_url && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">ANEXO</div>
                  {attachmentUrl ? (
                    <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                      <Paperclip className="w-4 h-4" /> Visualizar/baixar anexo
                    </a>
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-2">RESPOSTA INTERNA / NOTA ADMIN</div>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="w-full min-h-[100px] p-3 rounded-lg bg-background border border-border text-sm"
                  placeholder="Anotações sobre a resolução deste ticket..."
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border">
                <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Fechar</button>
                <button disabled={saving} onClick={() => updateStatus("em_andamento")} className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 text-sm hover:bg-blue-500/20 disabled:opacity-60">
                  Marcar em andamento
                </button>
                <button disabled={saving} onClick={() => updateStatus("resolvido")} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Marcar resolvido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    aberto: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    em_andamento: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    resolvido: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  };
  const labels: Record<string, string> = { aberto: "Aberto", em_andamento: "Em andamento", resolvido: "Resolvido" };
  return <span className={`px-2.5 py-1 rounded-full text-xs border ${styles[status] ?? "bg-secondary border-border"}`}>{labels[status] ?? status}</span>;
}

export default AdminSupport;
