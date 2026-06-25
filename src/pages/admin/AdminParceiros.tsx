import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/levels";
import { Loader2, CheckCircle2, XCircle, Banknote, UserCheck } from "lucide-react";
import { toast } from "sonner";

type Tab = "applications" | "payouts";

export default function AdminParceiros() {
  const [tab, setTab] = useState<Tab>("applications");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programa de Parceiros</h1>
        <p className="text-sm text-muted-foreground">Aprove adesões e processe os saques solicitados.</p>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-card p-1">
        <TabBtn active={tab === "applications"} onClick={() => setTab("applications")} icon={UserCheck} label="Adesões" />
        <TabBtn active={tab === "payouts"} onClick={() => setTab("payouts")} icon={Banknote} label="Saques" />
      </div>

      {tab === "applications" ? <ApplicationsTab /> : <PayoutsTab />}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2 ${
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function ApplicationsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ["admin-partner-apps", filter],
    queryFn: async () => {
      let q = supabase.from("partner_applications" as any).select("*").order("requested_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
      const list = (data as any[]) ?? [];
      if (list.length === 0) return [];
      const ids = list.map((a) => a.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      return list.map((a) => ({ ...a, profile: map.get(a.user_id) }));
    },
  });

  const review = async (id: string, status: "approved" | "rejected", notes?: string) => {
    const { error } = await supabase.from("partner_applications" as any).update({
      status, reviewed_at: new Date().toISOString(), review_notes: notes ?? null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Adesão aprovada!" : "Adesão rejeitada.");
    qc.invalidateQueries({ queryKey: ["admin-partner-apps"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
            {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : s === "approved" ? "Aprovados" : "Rejeitados"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : apps.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma solicitação.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="px-4 py-3">Fotógrafo</th>
                  <th className="px-4 py-3">Chave PIX</th>
                  <th className="px-4 py-3">Solicitado</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a: any) => (
                  <tr key={a.id} className="border-b border-border/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {a.profile?.avatar_url ? (
                          <img src={a.profile.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                            {(a.profile?.full_name?.[0] ?? "?").toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{a.profile?.full_name ?? a.user_id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono">
                      <div>{a.pix_key}</div>
                      <div className="text-muted-foreground">{a.pix_key_type}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{new Date(a.requested_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3"><StatusBadge s={a.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {a.status === "pending" && (
                        <div className="inline-flex gap-2">
                          <button onClick={() => review(a.id, "approved")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                          </button>
                          <button onClick={() => {
                            const notes = prompt("Motivo da rejeição (opcional):") ?? undefined;
                            review(a.id, "rejected", notes);
                          }}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-red-600">
                            <XCircle className="w-3.5 h-3.5" /> Rejeitar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PayoutsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("requested");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["admin-payouts", filter],
    queryFn: async () => {
      let q = supabase.from("partner_payouts" as any).select("*").order("requested_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
      const list = (data as any[]) ?? [];
      if (list.length === 0) return [];
      const ids = list.map((a) => a.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      return list.map((a) => ({ ...a, profile: map.get(a.user_id) }));
    },
  });

  const act = async (payout_id: string, action: "paid" | "rejected" | "processing", askTx = false) => {
    let tx_id: string | undefined;
    let notes: string | undefined;
    if (askTx) {
      tx_id = prompt("ID da transação PIX:") ?? undefined;
      if (!tx_id) return;
    }
    if (action === "rejected") {
      notes = prompt("Motivo da rejeição (opcional):") ?? undefined;
    }
    setBusy(payout_id);
    try {
      const { data, error } = await supabase.functions.invoke("partner-payout-process", {
        body: { payout_id, action, tx_id, notes },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Saque atualizado.");
      qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro");
    } finally {
      setBusy(null);
    }
  };

  const releaseEarnings = async () => {
    const { data, error } = await supabase.functions.invoke("release-earnings");
    if (error) return toast.error(error.message);
    toast.success(`${(data as any)?.released ?? 0} comissões liberadas.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {["requested", "processing", "paid", "rejected", "all"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>
        <button onClick={releaseEarnings}
          className="px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/80">
          Liberar comissões vencidas
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : payouts.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhum saque.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="px-4 py-3">Fotógrafo</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Chave PIX</th>
                  <th className="px-4 py-3">Solicitado</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/30">
                    <td className="px-4 py-3 font-medium">{p.profile?.full_name ?? p.user_id.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-bold text-primary">{formatBRL(Number(p.amount))}</td>
                    <td className="px-4 py-3 text-xs font-mono">
                      <div>{p.pix_key}</div>
                      <div className="text-muted-foreground">{p.pix_key_type}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{new Date(p.requested_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3"><StatusBadge s={p.status} /></td>
                    <td className="px-4 py-3 text-right">
                      {(p.status === "requested" || p.status === "processing") && (
                        <div className="inline-flex gap-2">
                          {p.status === "requested" && (
                            <button disabled={busy === p.id} onClick={() => act(p.id, "processing")}
                              className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 disabled:opacity-50">
                              Processar
                            </button>
                          )}
                          <button disabled={busy === p.id} onClick={() => act(p.id, "paid", true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50">
                            Marcar pago
                          </button>
                          <button disabled={busy === p.id} onClick={() => act(p.id, "rejected")}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-50">
                            Rejeitar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    revoked: "bg-red-100 text-red-700",
    requested: "bg-blue-100 text-blue-700",
    processing: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[s] ?? "bg-secondary"}`}>{s}</span>;
}