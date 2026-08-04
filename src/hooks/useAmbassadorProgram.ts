import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { platformRevenue, monthsRemaining } from "@/lib/ambassador";

export type ReferralRow = {
  id: string;
  referredId: string;
  name: string;
  createdAt: string;
  status: string;
  monthsLeft: number;
  grossSales: number;
  commission: number;
};

export type PayoutRow = {
  id: string;
  competence: string;
  amount: number;
  date: string | null;
  status: string;
};

export function useAmbassadorReferralCode() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ambassador-referral-code", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ensure_referral_code", { _user_id: user!.id });
      if (error) throw error;
      return data as string;
    },
  });
}

export function useAmbassadorProgram(enabled: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ambassador-program", user?.id],
    enabled: !!user?.id && enabled,
    queryFn: async () => {
      const [refsRes, earnRes, payoutsRes] = await Promise.all([
        supabase
          .from("referrals")
          .select("id, referred_id, status, created_at")
          .eq("referrer_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("referral_earnings")
          .select("id, referred_id, amount, commission_amount, status, created_at")
          .eq("referrer_id", user!.id),
        supabase
          .from("partner_payouts")
          .select("id, amount, status, requested_at, paid_at")
          .eq("user_id", user!.id)
          .order("requested_at", { ascending: false }),
      ]);

      const refs = refsRes.data ?? [];
      const earnings = earnRes.data ?? [];
      const payouts = payoutsRes.data ?? [];

      const ids = refs.map((r: any) => r.referred_id).filter(Boolean);
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        names = Object.fromEntries((profiles ?? []).map((p: any) => [p.user_id, p.full_name || "Fotógrafo"]));
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      const byReferred: Record<string, { gross: number; commission: number }> = {};
      let totalGross = 0;
      let totalCommission = 0;
      let monthCommission = 0;
      let pendingCommission = 0;
      let paidCommission = 0;

      for (const e of earnings as any[]) {
        const gross = Number(e.amount) || 0;
        const commission = Number(e.commission_amount) || 0;
        const key = e.referred_id as string;
        byReferred[key] = byReferred[key] || { gross: 0, commission: 0 };
        byReferred[key].gross += gross;
        byReferred[key].commission += commission;
        totalGross += gross;
        totalCommission += commission;
        if (new Date(e.created_at).getTime() >= monthStart) monthCommission += commission;
        if (e.status === "paid") paidCommission += commission;
        else if (e.status !== "blocked") pendingCommission += commission;
      }

      const referrals: ReferralRow[] = (refs as any[]).map((r) => ({
        id: r.id,
        referredId: r.referred_id,
        name: names[r.referred_id] || "Fotógrafo",
        createdAt: r.created_at,
        status: r.status || "pending",
        monthsLeft: monthsRemaining(r.created_at),
        grossSales: byReferred[r.referred_id]?.gross ?? 0,
        commission: byReferred[r.referred_id]?.commission ?? 0,
      }));

      const payoutRows: PayoutRow[] = (payouts as any[]).map((p) => {
        const ref = p.paid_at || p.requested_at;
        return {
          id: p.id,
          competence: ref
            ? new Date(ref).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
            : "—",
          amount: Number(p.amount) || 0,
          date: p.paid_at || p.requested_at || null,
          status: p.status || "pending",
        };
      });

      const totalPaidOut = payoutRows
        .filter((p) => p.status === "paid" || p.status === "pago")
        .reduce((s, p) => s + p.amount, 0);

      return {
        referrals,
        payouts: payoutRows,
        stats: {
          totalReferrals: referrals.length,
          activeReferrals: referrals.filter((r) => r.status === "active").length,
          platformRevenue: platformRevenue(totalGross),
          totalCommission,
          monthCommission,
          nextPayout: pendingCommission,
          totalReceived: totalPaidOut || paidCommission,
        },
      };
    },
  });
}
