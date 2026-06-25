import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardSidebar from "@/components/DashboardSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePhotographerLevel } from "@/hooks/usePhotographerLevel";
import { formatBRL } from "@/lib/levels";
import LevelBadge from "@/components/levels/LevelBadge";
import {
  Copy, Loader2, Users, TrendingUp, DollarSign, Handshake, Lock,
  Clock, CheckCircle2, AlertCircle, Wallet, Banknote
} from "lucide-react";
import { toast } from "sonner";

const LEVEL_ORDER: Record<string, number> = { bronze: 1, prata: 2, ouro: 3, diamante: 4, embaixador: 5 };
const MIN_PAYOUT = 50;
const PIX_TYPES = [
  { v: "cpf", label: "CPF" },
  { v: "cnpj", label: "CNPJ" },
  { v: "email", label: "E-mail" },
  { v: "phone", label: "Telefone" },
  { v: "random", label: "Chave aleatória" },
];

export default function Parceiros() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { level, rules, isLoading } = usePhotographerLevel();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const eligible = level && LEVEL_ORDER[level.current_level] >= 3;

  useEffect(() => {
    if (!user || !eligible) return;
    supabase.rpc("ensure_referral_code" as any, { _user_id: user.id })
      .then(({ data }) => setReferralCode((data as any) || null));
  }, [user, eligible]);

  const { data: application, refetch: refetchApp } = useQuery({
    queryKey: ["partner-application", user?.id],
    enabled: !!user?.id && !!eligible,
    queryFn: async () => {
      const { data } = await supabase.from("partner_applications" as any)
        .select("*").eq("user_id", user!.id).maybeSingle();
      return data as any;
    },
  });

  const approved = application?.status === "approved";

  const { data: referrals = [] } = useQuery({
    queryKey: ["my-referrals", user?.id],
    enabled: !!user?.id && approved,
    queryFn: async () => {
      const { data } = await supabase.from("referrals" as any)
        .select("*").eq("referrer_id", user!.id).order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const { data: earnings = [] } = useQuery({
    queryKey: ["my-referral-earnings", user?.id],
    enabled: !!user?.id && approved,
    queryFn: async () => {
      const { data } = await supabase.from("referral_earnings" as any)
        .select("*").eq("referrer_id", user!.id).order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["my-payouts", user?.id],
    enabled: !!user?.id && approved,
    queryFn: async () => {
      const { data } = await supabase.from("partner_payouts" as any)
        .select("*").eq("user_id", user!.id).order("requested_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  // GATE: nível < Ouro
  if (!eligible) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8">
          <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Programa de Parceiros</h1>
            <p className="text-sm text-muted-foreground mb-4">
              O Programa de Parceiros é desbloqueado a partir do nível <strong>Ouro</strong>.
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-sm">Seu nível atual:</span>
              {level && <LevelBadge level={level.current_level} size="sm" />}
            </div>
            <Link to="/dashboard/nivel"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90">
              Ver minha Jornada
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ONBOARDING: sem adesão ou pendente/rejeitada
  if (!approved) {
    const status = application?.status;
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl sm:text-2xl font-bold mb-2">Programa de Parceiros</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Indique fotógrafos e receba comissões sobre as vendas deles. A adesão passa por análise da equipe Viu Foto.
            </p>

            {status === "pending" && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900">Solicitação em análise</p>
                  <p className="text-amber-800">Você será notificado quando a aprovação for concluída.</p>
                </div>
              </div>
            )}
            {status === "rejected" && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 mb-4">
                <p className="font-semibold text-red-900 text-sm">Solicitação não aprovada</p>
                {application?.review_notes && (
                  <p className="text-xs text-red-800 mt-1">{application.review_notes}</p>
                )}
              </div>
            )}

            <PartnerApplicationForm
              userId={user!.id}
              initial={application}
              submitting={submitting}
              setSubmitting={setSubmitting}
              onSubmitted={() => refetchApp()}
              disabled={status === "pending"}
            />
          </div>
        </main>
      </div>
    );
  }

  // DASHBOARD
  const referralUrl = referralCode ? `${window.location.origin}/r/${referralCode}` : "";
  const commissionPct = rules.find((r) => r.level === level!.current_level)?.commission_pct ?? 1;

  const totalPending = earnings.filter((e: any) => e.status === "pending")
    .reduce((s, e: any) => s + Number(e.commission_amount ?? 0), 0);
  const totalAvailable = earnings.filter((e: any) => e.status === "available")
    .reduce((s, e: any) => s + Number(e.commission_amount ?? 0), 0);
  const totalRequested = earnings.filter((e: any) => e.status === "requested")
    .reduce((s, e: any) => s + Number(e.commission_amount ?? 0), 0);
  const totalPaid = earnings.filter((e: any) => e.status === "paid")
    .reduce((s, e: any) => s + Number(e.commission_amount ?? 0), 0);

  const activeCount = referrals.filter((r: any) => r.status === "active").length;

  const requestPayout = async () => {
    if (totalAvailable < MIN_PAYOUT) {
      toast.error(`Saldo mínimo para saque é ${formatBRL(MIN_PAYOUT)}.`);
      return;
    }
    setRequestingPayout(true);
    try {
      const { data, error } = await supabase.functions.invoke("partner-payout-request");
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast.success("Solicitação de saque enviada!");
      qc.invalidateQueries({ queryKey: ["my-payouts"] });
      qc.invalidateQueries({ queryKey: ["my-referral-earnings"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao solicitar saque");
    } finally {
      setRequestingPayout(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8 overflow-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Programa de Parceiros</h1>
            <p className="text-sm text-muted-foreground">
              Comissão atual: <strong className="text-primary">{commissionPct}%</strong> · Retenção de 30 dias antes do saque.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Adesão aprovada
          </span>
        </div>

        {/* Link de indicação */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-xs text-muted-foreground mb-2">Seu link de indicação</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input readOnly value={referralUrl}
              className="flex-1 bg-background rounded-lg px-3 py-2.5 text-sm font-mono outline-none border border-border" />
            <button onClick={() => { navigator.clipboard.writeText(referralUrl); toast.success("Link copiado!"); }}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary/90">
              <Copy className="w-4 h-4" /> Copiar
            </button>
          </div>
        </div>

        {/* KPIs financeiros */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={Wallet} label="Saldo disponível" value={formatBRL(totalAvailable)} accent />
          <KpiCard icon={Clock} label="Em retenção (30d)" value={formatBRL(totalPending)} />
          <KpiCard icon={Banknote} label="Saque solicitado" value={formatBRL(totalRequested)} />
          <KpiCard icon={DollarSign} label="Total recebido" value={formatBRL(totalPaid)} />
        </div>

        {/* Botão saque */}
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Solicitar saque via PIX</p>
            <p className="text-xs text-muted-foreground">
              Mínimo {formatBRL(MIN_PAYOUT)} · Chave: <span className="font-mono">{application?.pix_key}</span>
            </p>
          </div>
          <button onClick={requestPayout}
            disabled={requestingPayout || totalAvailable < MIN_PAYOUT}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
            {requestingPayout && <Loader2 className="w-4 h-4 animate-spin" />}
            Solicitar {formatBRL(totalAvailable)}
          </button>
        </div>

        {/* KPIs Indicações */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard icon={Users} label="Indicados" value={String(referrals.length)} />
          <KpiCard icon={Handshake} label="Ativos (90d)" value={String(activeCount)} />
        </div>

        {/* Histórico earnings */}
        <SectionCard title="Comissões">
          {earnings.length === 0 ? (
            <Empty msg="Nenhuma comissão ainda. Compartilhe seu link!" />
          ) : (
            <Table headers={["Data", "Valor venda", "Comissão", "Status", "Liberação"]}>
              {earnings.slice(0, 30).map((e: any) => (
                <tr key={e.id} className="border-b border-border/30">
                  <td className="px-4 py-3">{new Date(e.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">{formatBRL(Number(e.amount))}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{formatBRL(Number(e.commission_amount ?? 0))}</td>
                  <td className="px-4 py-3"><StatusPill s={e.status} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {e.hold_until ? new Date(e.hold_until).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </SectionCard>

        {/* Histórico saques */}
        <SectionCard title="Saques">
          {payouts.length === 0 ? (
            <Empty msg="Nenhum saque solicitado." />
          ) : (
            <Table headers={["Solicitado em", "Valor", "Status", "Pago em", "TX"]}>
              {payouts.map((p: any) => (
                <tr key={p.id} className="border-b border-border/30">
                  <td className="px-4 py-3">{new Date(p.requested_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 font-semibold">{formatBRL(Number(p.amount))}</td>
                  <td className="px-4 py-3"><StatusPill s={p.status} /></td>
                  <td className="px-4 py-3 text-xs">{p.paid_at ? new Date(p.paid_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono">{p.tx_id ?? "—"}</td>
                </tr>
              ))}
            </Table>
          )}
        </SectionCard>
      </main>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: any) {
  return (
    <div className={`rounded-2xl border bg-card p-4 ${accent ? "border-primary/30 bg-primary/5" : "border-border"}`}>
      <Icon className={`w-4 h-4 mb-2 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionCard({ title, children }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Table({ headers, children }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b border-border/50 text-xs uppercase">
          <tr>{headers.map((h: string) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="p-6 text-sm text-muted-foreground text-center">{msg}</p>;
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending: { bg: "bg-amber-100", fg: "text-amber-700", label: "Em retenção" },
    available: { bg: "bg-emerald-100", fg: "text-emerald-700", label: "Disponível" },
    requested: { bg: "bg-blue-100", fg: "text-blue-700", label: "Solicitado" },
    processing: { bg: "bg-blue-100", fg: "text-blue-700", label: "Em processamento" },
    paid: { bg: "bg-emerald-100", fg: "text-emerald-700", label: "Pago" },
    rejected: { bg: "bg-red-100", fg: "text-red-700", label: "Rejeitado" },
    reversed: { bg: "bg-red-100", fg: "text-red-700", label: "Estornado" },
  };
  const v = map[s] ?? { bg: "bg-secondary", fg: "text-muted-foreground", label: s };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${v.bg} ${v.fg}`}>{v.label}</span>;
}

function PartnerApplicationForm({ userId, initial, submitting, setSubmitting, onSubmitted, disabled }: any) {
  const [pixKey, setPixKey] = useState(initial?.pix_key ?? "");
  const [pixKeyType, setPixKeyType] = useState(initial?.pix_key_type ?? "cpf");
  const [accepted, setAccepted] = useState(!!initial?.accepted_terms_at);

  const submit = async () => {
    if (!pixKey.trim()) return toast.error("Informe sua chave PIX.");
    if (!accepted) return toast.error("Aceite os termos para continuar.");
    setSubmitting(true);
    try {
      const payload = {
        user_id: userId,
        pix_key: pixKey.trim(),
        pix_key_type: pixKeyType,
        accepted_terms_at: new Date().toISOString(),
        status: "pending",
      };
      const { error } = await supabase.from("partner_applications" as any)
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Solicitação enviada para análise!");
      onSubmitted();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div>
        <label className="text-xs font-semibold text-muted-foreground">Tipo de chave PIX</label>
        <select value={pixKeyType} onChange={(e) => setPixKeyType(e.target.value)} disabled={disabled}
          className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
          {PIX_TYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground">Chave PIX</label>
        <input value={pixKey} onChange={(e) => setPixKey(e.target.value)} disabled={disabled}
          placeholder="Sua chave PIX para recebimento"
          className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
      </div>
      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} disabled={disabled}
          className="mt-0.5" />
        <span>
          Li e concordo com os termos do Programa de Parceiros: comissões são creditadas após 30 dias de retenção,
          saque mínimo de {formatBRL(MIN_PAYOUT)}, sujeito a análise antifraude e podendo ser estornadas em caso de reembolso.
        </span>
      </label>
      <button onClick={submit} disabled={submitting || disabled}
        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2">
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {initial ? "Reenviar solicitação" : "Solicitar adesão"}
      </button>
    </div>
  );
}