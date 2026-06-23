import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardSidebar from "@/components/DashboardSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePhotographerLevel } from "@/hooks/usePhotographerLevel";
import { formatBRL } from "@/lib/levels";
import LevelBadge from "@/components/levels/LevelBadge";
import { Copy, Loader2, Users, TrendingUp, DollarSign, Handshake, Lock } from "lucide-react";
import { toast } from "sonner";

const LEVEL_ORDER = { bronze: 1, prata: 2, ouro: 3, diamante: 4, embaixador: 5 };

export default function Parceiros() {
  const { user } = useAuth();
  const { level, rules, isLoading } = usePhotographerLevel();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);

  const eligible = level && LEVEL_ORDER[level.current_level] >= 3;

  useEffect(() => {
    if (!user || !eligible) return;
    const load = async () => {
      const { data: rpc } = await supabase.rpc("ensure_referral_code" as any, { _user_id: user.id });
      setReferralCode((rpc as any) || null);
    };
    load();
  }, [user, eligible]);

  const { data: referrals = [] } = useQuery({
    queryKey: ["my-referrals", user?.id],
    enabled: !!user?.id && !!eligible,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals" as any)
        .select("*")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const { data: earnings = [] } = useQuery({
    queryKey: ["my-referral-earnings", user?.id],
    enabled: !!user?.id && !!eligible,
    queryFn: async () => {
      const { data } = await supabase
        .from("referral_earnings" as any)
        .select("*")
        .eq("referrer_id", user!.id);
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

  if (!eligible) {
    return (
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8">
          <div className="max-w-2xl mx-auto glass-card p-8 text-center">
            <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Programa de Parceiros</h1>
            <p className="text-sm text-muted-foreground mb-4">
              O Programa de Parceiros é desbloqueado a partir do nível <strong>Ouro</strong>.
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-sm">Seu nível atual:</span>
              {level && <LevelBadge level={level.current_level} size="sm" />}
            </div>
            <Link
              to="/dashboard/configuracoes?tab=nivel"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90"
            >
              Ver meu progresso
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const referralUrl = referralCode ? `${window.location.origin}/r/${referralCode}` : "";
  const totalEarnings = earnings.reduce((s, e: any) => s + Number(e.amount), 0);
  const activeCount = referrals.filter((r: any) => r.status === "active").length;
  const totalSales = earnings.length;
  const totalRevenue = earnings.reduce((s, e: any) => s + Number(e.amount) / (Number(e.commission_pct) / 100 || 1), 0);
  const commissionPct = rules.find((r) => r.level === level!.current_level)?.commission_pct ?? 1;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8 overflow-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Programa de Parceiros</h1>
          <p className="text-sm text-muted-foreground">
            Comissão atual: <strong className="text-primary">{commissionPct}%</strong> sobre vendas dos fotógrafos que você indicar.
          </p>
        </div>

        {/* Link de indicação */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-xs text-muted-foreground mb-2">Seu link de indicação</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={referralUrl}
              className="flex-1 bg-background rounded-lg px-3 py-2.5 text-sm font-mono outline-none border border-border"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralUrl);
                toast.success("Link copiado!");
              }}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-2 hover:bg-primary/90"
            >
              <Copy className="w-4 h-4" /> Copiar
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Indicados", value: referrals.length, icon: Users },
            { label: "Ativos", value: activeCount, icon: Handshake },
            { label: "Vendas geradas", value: totalSales, icon: TrendingUp },
            { label: "Comissão acumulada", value: formatBRL(totalEarnings), icon: DollarSign },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4">
              <k.icon className="w-4 h-4 text-primary mb-2" />
              <p className="text-xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Tabela de indicados */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Fotógrafos indicados</h3>
          </div>
          {referrals.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              Nenhum fotógrafo indicado ainda. Compartilhe seu link!
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="px-4 py-3">Indicado em</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Comissão gerada</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r: any) => {
                  const sum = earnings
                    .filter((e: any) => e.referred_id === r.referred_id)
                    .reduce((s, e: any) => s + Number(e.amount), 0);
                  return (
                    <tr key={r.id} className="border-b border-border/30">
                      <td className="px-4 py-3">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === "active" ? "bg-emerald-500/15 text-emerald-600" : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {r.status === "active" ? "Ativo" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">{formatBRL(sum)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}