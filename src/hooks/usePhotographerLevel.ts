import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { LevelKey, LevelRule } from "@/lib/levels";

export interface PhotographerLevelData {
  current_level: LevelKey;
  is_ambassador: boolean;
  events_count: number;
  sales_count: number;
  revenue_total: number;
  referrals_count: number;
  history: { level: LevelKey; at: string }[];
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string | null;
  criteria: any;
  sort_order: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

export function usePhotographerLevel(userId?: string) {
  const { user } = useAuth();
  const uid = userId ?? user?.id;

  const levelQ = useQuery({
    queryKey: ["photographer-level", uid],
    enabled: !!uid,
    queryFn: async (): Promise<PhotographerLevelData> => {
      const { data } = await supabase
        .from("photographer_levels" as any)
        .select("*")
        .eq("user_id", uid!)
        .maybeSingle();
      return (
        (data as any) ?? {
          current_level: "bronze",
          is_ambassador: false,
          events_count: 0,
          sales_count: 0,
          revenue_total: 0,
          referrals_count: 0,
          history: [],
        }
      );
    },
  });

  const rulesQ = useQuery({
    queryKey: ["level-rules"],
    queryFn: async (): Promise<LevelRule[]> => {
      const { data } = await supabase.from("level_rules" as any).select("*").order("sort_order");
      return (data as any) ?? [];
    },
    staleTime: 60_000,
  });

  const achievementsQ = useQuery({
    queryKey: ["achievements", uid],
    enabled: !!uid,
    queryFn: async (): Promise<Achievement[]> => {
      const [{ data: catalog }, { data: unlocked }] = await Promise.all([
        supabase.from("achievements" as any).select("*").eq("active", true).order("sort_order"),
        supabase.from("photographer_achievements" as any).select("achievement_id, unlocked_at").eq("user_id", uid!),
      ]);
      const map = new Map<string, string>();
      (unlocked as any[] | null)?.forEach((u) => map.set(u.achievement_id, u.unlocked_at));
      return ((catalog as any[]) ?? []).map((a) => ({
        ...a,
        unlocked: map.has(a.id),
        unlocked_at: map.get(a.id) ?? null,
      }));
    },
  });

  return {
    level: levelQ.data,
    rules: rulesQ.data ?? [],
    achievements: achievementsQ.data ?? [],
    isLoading: levelQ.isLoading || rulesQ.isLoading,
    refetch: () => {
      levelQ.refetch();
      achievementsQ.refetch();
    },
  };
}