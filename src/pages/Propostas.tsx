import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import LoadingButton from "@/components/LoadingButton";
import { toast } from "sonner";
import {
  Handshake, MessageSquare, Paperclip, Check, X, ArrowLeft,
  Send, FileText, Download, Inbox, User, Calendar, DollarSign,
} from "lucide-react";

type AppRow = {
  id: string;
  event_id: string;
  photographer_id: string;
  message: string | null;
  suggested_fee: number | null;
  status: string;
  organizer_response: string | null;
  created_at: string;
  events?: { name: string; event_date: string; location: string; organizer_id: string } | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

type Proposal = {
  id: string;
  title: string;
  description: string | null;
  fee: number | null;
  deadline: string | null;
  status: string;
  organizer_id: string;
  photographer_id: string;
  event_id: string;
  created_at: string;
  events?: { name: string } | null;
};

const statusColor: Record<string, string> = {
  pendente: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  aceita: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejeitada: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  cancelada: "bg-muted text-muted-foreground",
  enviada: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  em_negociacao: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  encerrada: "bg-muted text-muted-foreground",
  rascunho: "bg-muted text-muted-foreground",
};

export default function Propostas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  /* ---- Candidaturas: como fotógrafo (minhas) ---- */
  const { data: myApps = [] } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_applications")
        .select("*, events(name, event_date, location, organizer_id)")
        .eq("photographer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AppRow[];
    },
  });

  /* ---- Candidaturas recebidas: como organizador ---- */
  const { data: receivedApps = [] } = useQuery({
    queryKey: ["received-applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: events } = await supabase
        .from("events").select("id").eq("organizer_id", user!.id);
      const ids = (events || []).map((e: any) => e.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("event_applications")
        .select("*, events(name, event_date, location, organizer_id)")
        .in("event_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // load photographer profiles
      const userIds = Array.from(new Set((data || []).map((a: any) => a.photographer_id)));
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name, avatar_url").in("user_id", userIds);
      const pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((a: any) => ({ ...a, profiles: pmap.get(a.photographer_id) || null })) as AppRow[];
    },
  });

  /* ---- Propostas (organizer ou photographer) ---- */
  const { data: proposals = [] } = useQuery({
    queryKey: ["proposals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*, events(name)")
        .or(`organizer_id.eq.${user!.id},photographer_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Proposal[];
    },
  });

  /* ---- Responder candidatura (organizador) ---- */
  const respond = useMutation({
    mutationFn: async (p: { id: string; status: "aceita" | "rejeitada"; response?: string; app: AppRow }) => {
      const { error } = await supabase
        .from("event_applications")
        .update({ status: p.status, organizer_response: p.response || null, responded_at: new Date().toISOString() })
        .eq("id", p.id);
      if (error) throw error;

      // se aceita: cria proposta inicial automática
      if (p.status === "aceita" && user && p.app.events) {
        await supabase.from("proposals").insert({
          event_id: p.app.event_id,
          organizer_id: p.app.events.organizer_id,
          photographer_id: p.app.photographer_id,
          title: `Cobertura: ${p.app.events.name}`,
          description: "Candidatura aceita. Vamos alinhar os detalhes aqui.",
          fee: p.app.suggested_fee,
          status: "em_negociacao",
          created_by: user.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Resposta enviada");
      qc.invalidateQueries({ queryKey: ["received-applications"] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro"),
  });

  const cancelApp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("event_applications").update({ status: "cancelada" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidatura cancelada");
      qc.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });

  const stats = useMemo(() => ({
    enviadas: myApps.length,
    recebidas: receivedApps.length,
    propostas: proposals.length,
  }), [myApps, receivedApps, proposals]);

  if (selected) {
    return <ProposalDetail id={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-18 lg:pt-6 lg:p-8 overflow-auto space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <Handshake className="w-3.5 h-3.5" /> Propostas & Candidaturas
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Negociações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas candidaturas, propostas formais e converse com a outra parte.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Minhas candidaturas" value={stats.enviadas} />
          <Kpi label="Recebidas" value={stats.recebidas} />
          <Kpi label="Propostas ativas" value={stats.propostas} />
        </div>

        <Tabs defaultValue="propostas" className="w-full">
          <TabsList>
            <TabsTrigger value="propostas">Propostas ({proposals.length})</TabsTrigger>
            <TabsTrigger value="recebidas">Recebidas ({receivedApps.length})</TabsTrigger>
            <TabsTrigger value="enviadas">Enviadas ({myApps.length})</TabsTrigger>
          </TabsList>

          {/* PROPOSTAS */}
          <TabsContent value="propostas" className="mt-4">
            {proposals.length === 0 ? (
              <Empty icon={Handshake} title="Sem propostas ainda" desc="Aceite uma candidatura ou crie uma proposta direta." />
            ) : (
              <ul className="space-y-2">
                {proposals.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelected(p.id)}
                      className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{p.events?.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                            {p.fee != null && (
                              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> R$ {Number(p.fee).toFixed(2)}</span>
                            )}
                            {p.deadline && (
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(p.deadline).toLocaleDateString("pt-BR")}</span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={statusColor[p.status]}>{p.status.replace("_", " ")}</Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* RECEBIDAS (organizador) */}
          <TabsContent value="recebidas" className="mt-4">
            {receivedApps.length === 0 ? (
              <Empty icon={Inbox} title="Nenhuma candidatura recebida" desc="Quando fotógrafos se candidatarem aos seus eventos, aparecerão aqui." />
            ) : (
              <ul className="space-y-2">
                {receivedApps.map((a) => (
                  <li key={a.id} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {a.profiles?.full_name || "Fotógrafo"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{a.events?.name}</p>
                      </div>
                      <Badge variant="outline" className={statusColor[a.status]}>{a.status}</Badge>
                    </div>
                    {a.message && <p className="text-sm text-foreground/80 bg-muted/40 p-3 rounded-lg mb-2">{a.message}</p>}
                    {a.suggested_fee != null && (
                      <p className="text-xs text-muted-foreground mb-2">Cachê sugerido: <strong>R$ {Number(a.suggested_fee).toFixed(2)}</strong></p>
                    )}
                    {a.status === "pendente" && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => respond.mutate({ id: a.id, status: "aceita", app: a })} disabled={respond.isPending}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Aceitar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => respond.mutate({ id: a.id, status: "rejeitada", app: a })} disabled={respond.isPending}>
                          <X className="w-3.5 h-3.5 mr-1" /> Rejeitar
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          {/* ENVIADAS (fotógrafo) */}
          <TabsContent value="enviadas" className="mt-4">
            {myApps.length === 0 ? (
              <Empty icon={Send} title="Nenhuma candidatura enviada" desc="Vá para Oportunidades e clique em 'Quero fotografar este evento'." />
            ) : (
              <ul className="space-y-2">
                {myApps.map((a) => (
                  <li key={a.id} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{a.events?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.events?.location}</p>
                        {a.suggested_fee != null && (
                          <p className="text-xs text-muted-foreground mt-1">Cachê sugerido: R$ {Number(a.suggested_fee).toFixed(2)}</p>
                        )}
                        {a.organizer_response && (
                          <p className="text-sm text-foreground/80 bg-muted/40 p-2 rounded mt-2">"{a.organizer_response}"</p>
                        )}
                      </div>
                      <Badge variant="outline" className={statusColor[a.status]}>{a.status}</Badge>
                    </div>
                    {a.status === "pendente" && (
                      <Button size="sm" variant="ghost" className="mt-2" onClick={() => cancelApp.mutate(a.id)}>
                        Cancelar candidatura
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ─────────────── Detalhe de proposta ─────────────── */
function ProposalDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: proposal } = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals").select("*, events(name)").eq("id", id).single();
      if (error) throw error;
      return data as Proposal;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["proposal-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_comments").select("*").eq("proposal_id", id).order("created_at");
      if (error) throw error;
      // pegar nomes
      const uids = Array.from(new Set((data || []).map((c: any) => c.author_id)));
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name, avatar_url").in("user_id", uids);
      const pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      return (data || []).map((c: any) => ({ ...c, author: pmap.get(c.author_id) }));
    },
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["proposal-attachments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_attachments").select("*").eq("proposal_id", id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !comment.trim()) return;
      const { error } = await supabase.from("proposal_comments").insert({
        proposal_id: id, author_id: user.id, content: comment.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["proposal-comments", id] }); },
    onError: (e: any) => toast.error(e?.message || "Erro"),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("proposals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["proposal", id] });
      qc.invalidateQueries({ queryKey: ["proposals"] });
    },
  });

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("proposal-attachments").upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("proposal_attachments").insert({
        proposal_id: id, uploaded_by: user.id,
        file_path: path, file_name: file.name,
        file_size: file.size, mime_type: file.type,
      });
      if (dbErr) throw dbErr;
      toast.success("Anexo enviado");
      qc.invalidateQueries({ queryKey: ["proposal-attachments", id] });
    } catch (e: any) {
      toast.error(e?.message || "Erro no upload");
    } finally { setUploading(false); }
  };

  const downloadAttachment = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("proposal-attachments").createSignedUrl(path, 60);
    if (error) return toast.error("Não foi possível baixar");
    const a = document.createElement("a");
    a.href = data.signedUrl; a.download = name; a.click();
  };

  if (!proposal) return null;

  const isOrganizer = proposal.organizer_id === user?.id;
  const canAct = ["enviada", "em_negociacao"].includes(proposal.status);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-18 lg:pt-6 lg:p-8 overflow-auto space-y-4 max-w-3xl">
        <button onClick={onBack} className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-lg font-bold text-foreground">{proposal.title}</h1>
              <p className="text-xs text-muted-foreground">{proposal.events?.name}</p>
            </div>
            <Badge variant="outline" className={statusColor[proposal.status]}>{proposal.status.replace("_", " ")}</Badge>
          </div>
          {proposal.description && <p className="text-sm text-foreground/80 mb-3">{proposal.description}</p>}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {proposal.fee != null && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> R$ {Number(proposal.fee).toFixed(2)}</span>}
            {proposal.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(proposal.deadline).toLocaleDateString("pt-BR")}</span>}
          </div>

          {canAct && (
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => updateStatus.mutate("aceita")} disabled={updateStatus.isPending}>
                <Check className="w-3.5 h-3.5 mr-1" /> Aceitar
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate("rejeitada")} disabled={updateStatus.isPending}>
                <X className="w-3.5 h-3.5 mr-1" /> Rejeitar
              </Button>
              {isOrganizer && (
                <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate("encerrada")}>Encerrar</Button>
              )}
            </div>
          )}
        </div>

        {/* Anexos */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-2"><Paperclip className="w-4 h-4" /> Anexos</h2>
            <label className="text-xs font-semibold text-primary cursor-pointer hover:underline">
              {uploading ? "Enviando..." : "+ Adicionar"}
              <input
                type="file" className="hidden" disabled={uploading}
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
            </label>
          </div>
          {attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum anexo. Adicione contratos, briefings ou referências.</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{a.file_name}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => downloadAttachment(a.file_path, a.file_name)}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Comentários */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4" /> Conversa
          </h2>
          <div className="space-y-3 max-h-96 overflow-auto mb-3">
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nenhuma mensagem ainda. Inicie a conversa abaixo.</p>
            ) : comments.map((c: any) => {
              const mine = c.author_id === user?.id;
              return (
                <div key={c.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <p className="text-[10px] opacity-70 mb-0.5">{c.author?.full_name || "Usuário"}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{c.content}</p>
                    <p className="text-[10px] opacity-60 mt-1">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={comment} onChange={(e) => setComment(e.target.value)}
              placeholder="Escreva uma mensagem..."
              rows={2} maxLength={2000}
              className="flex-1"
            />
            <LoadingButton onClick={() => addComment.mutate()} loading={addComment.isPending} disabled={!comment.trim()}>
              <Send className="w-4 h-4" />
            </LoadingButton>
          </div>
        </div>
      </main>
    </div>
  );
}

/* helpers */
const Kpi = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-border bg-card px-4 py-3">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-xl font-bold text-foreground">{value}</p>
  </div>
);

const Empty = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border">
    <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-muted-foreground" />
    </div>
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{desc}</p>
  </div>
);