import { useEffect, useMemo, useState } from "react";
import { Loader2, Inbox, Mail, AlertCircle, CheckCircle2, Paperclip, ExternalLink, Clock } from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type Ticket = {
  id: string;
  user_email: string;
  user_name: string | null;
  category: string;
  subject: string;
  message: string;
  attachment_url: string | null;
  photo_url: string | null;
  photo_id: string | null;
  event_id: string | null;
  status: string;
  admin_response: string | null;
  escalate_after: string | null;
  created_at: string;
  resolved_at: string | null;
};

function hoursLeft(escalateAfter: string | null): number | null {
  if (!escalateAfter) return null;
  const ms = new Date(escalateAfter).getTime() - Date.now();
  return Math.max(0, Math.round((ms / (1000 * 60 * 60)) * 10) / 10);
}

const Chamados = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [response, setResponse] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("support_tickets")
      .select("*")
      .eq("assigned_photographer_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Erro ao carregar chamados", description: error.message, variant: "destructive" });
    setTickets((data as Ticket[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    setAttachmentUrl(null);
    setResponse(selected?.admin_response ?? "");
    if (!selected?.attachment_url) return;
    supabase.storage.from("support-attachments").createSignedUrl(selected.attachment_url, 3600).then(({ data }) => {
      if (data?.signedUrl) setAttachmentUrl(data.signedUrl);
    });
  }, [selected]);

  const counts = useMemo(() => ({
    abertos: tickets.filter((t) => t.status === "aberto").length,
    em_andamento: tickets.filter((t) => t.status === "em_andamento").length,
    resolvidos: tickets.filter((t) => t.status === "resolvido").length,
  }), [tickets]);

  const resolve = async (status: "em_andamento" | "resolvido") => {
    if (!selected) return;
    setSaving(true);
    const payload: any = { status, admin_response: response || null };
    if (status === "resolvido") {
      payload.resolved_at = new Date().toISOString();
      payload.resolved_by = user?.id;
    }
    const { error } = await (supabase as any).from("support_tickets").update(payload).eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "resolvido" ? "Chamado resolvido" : "Chamado atualizado" });
    setSelected(null);
    load();
  };

  return (
    <div className="min-h-screen flex bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-6 lg:p-10 pt-20 lg:pt-10 space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Chamados de Privacidade</h1>
            <p className="text-sm text-muted-foreground">
              Pedidos de remoção de fotos enviados por clientes. Você tem <strong>24h</strong> para resolver — após isso, o caso é escalado para a equipe Viu Foto.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">Abertos: {counts.abertos}</span>
            <span className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">Em andamento: {counts.em_andamento}</span>
            <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Resolvidos: {counts.resolvidos}</span>
          </div>
        </header>

        {loading ? (
          <div className="glass-card p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Nenhum chamado por aqui</h3>
            <p className="text-sm text-muted-foreground">Quando um cliente solicitar a remoção de uma foto sua, ela aparece aqui imediatamente.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Mensagem</th>
                  <th className="text-left p-3">Prazo</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const hrs = hoursLeft(t.escalate_after);
                  const isUrgent = hrs !== null && hrs <= 6 && t.status !== "resolvido";
                  return (
                    <tr key={t.id} onClick={() => setSelected(t)} className="border-t border-border hover:bg-secondary/40 cursor-pointer">
                      <td className="p-3">
                        <div className="font-medium">{t.user_name || "—"}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{t.user_email}</div>
                      </td>
                      <td className="p-3 max-w-md truncate text-muted-foreground">{t.message}</td>
                      <td className="p-3">
                        {t.status === "resolvido" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : hrs === null ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-xs ${isUrgent ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                            <Clock className="w-3 h-3" /> {hrs > 0 ? `${hrs}h restantes` : "Vencido"}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={t.status} />
                      </td>
                    </tr>
                  );
                })}
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
                  <div className="text-sm text-muted-foreground mt-1">{selected.user_name || "—"} · {selected.user_email}</div>
                  <div className="text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleString("pt-BR")}</div>
                </div>
                <StatusBadge status={selected.status} />
              </div>
              <div className="p-5 space-y-4">
                {hoursLeft(selected.escalate_after) !== null && selected.status !== "resolvido" && (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Prazo: <strong>{hoursLeft(selected.escalate_after)}h restantes</strong>. Após esse prazo o caso é escalado para o Super Admin da Viu Foto.
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">MENSAGEM DO CLIENTE</div>
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
                  <div className="text-xs font-semibold text-muted-foreground mb-2">SUA RESPOSTA / NOTA INTERNA</div>
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="w-full min-h-[100px] p-3 rounded-lg bg-background border border-border text-sm"
                    placeholder="Ex.: Foto removida do álbum. Cliente notificado."
                  />
                </div>
                <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-border">
                  <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary">Fechar</button>
                  {selected.status !== "resolvido" && (
                    <>
                      <button disabled={saving} onClick={() => resolve("em_andamento")} className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 text-sm hover:bg-blue-500/20 disabled:opacity-60">
                        Marcar em andamento
                      </button>
                      <button disabled={saving} onClick={() => resolve("resolvido")} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Marcar resolvido
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
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

export default Chamados;