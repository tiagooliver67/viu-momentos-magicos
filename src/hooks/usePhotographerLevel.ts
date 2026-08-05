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
  eligible_events_count: number;
  attended_participations_count: number;
  eligible_revenue_total: number;
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

export interface Specialty {
  id: string;
  code: string;
  title: string;
  icon: string;
  min_events: number;
  min_photos_sold: number;
  min_unique_clients: number;
}

export interface PhotographerSpecialty extends Specialty {
  events_count: number;
  photos_sold_count: number;
  unique_clients_count: number;
  unlocked_at: string | null;
  level: string;
  progress: number;
}

export interface Reputation {
  score: number;
  rating_avg: number;
  total_reviews: number;
  response_rate: number;
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
          eligible_events_count: 0,
          attended_participations_count: 0,
          eligible_revenue_total: 0,
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

  const specialtiesQ = useQuery({
    queryKey: ["specialties", uid],
    enabled: !!uid,
    queryFn: async (): Promise<PhotographerSpecialty[]> => {
      const [{ data: catalog }, { data: userSpecialties }] = await Promise.all([
        supabase.from("specialties" as any).select("*").order("sort_order"),
        supabase.from("photographer_specialties" as any).select("*").eq("user_id", uid!),
      ]);

      const userMap = new Map<string, any>();
      (userSpecialties as any[] | null)?.forEach((us) => userMap.set(us.specialty_id, us));

      return ((catalog as any[]) ?? []).map((s) => {
        const us = userMap.get(s.id) || {
          events_count: 0,
          photos_sold_count: 0,
          unique_clients_count: 0,
          unlocked_at: null,
          level: "Especialista",
        };

        const eventProg = s.min_events > 0 ? Math.min(1, us.events_count / s.min_events) : 1;
        const salesProg = s.min_photos_sold > 0 ? Math.min(1, us.photos_sold_count / s.min_photos_sold) : 1;
        const clientProg = s.min_unique_clients > 0 ? Math.min(1, us.unique_clients_count / s.min_unique_clients) : 1;

        // Progress is the minimum of required criteria (AND mode)
        const progress = Math.min(eventProg, salesProg, clientProg) * 100;

        return {
          ...s,
          ...us,
          progress: Math.round(progress),
        };
      });
    },
  });

  const reputationQ = useQuery({
    queryKey: ["reputation", uid],
    enabled: !!uid,
    queryFn: async (): Promise<Reputation> => {
      const { data } = await supabase
        .from("photographer_reputation" as any)
        .select("*")
        .eq("user_id", uid!)
        .maybeSingle();
      
      return (data as any) ?? {
        score: 0,
        rating_avg: 0,
        total_reviews: 0,
        response_rate: 100,
      };
    }
  });

  return {
    level: levelQ.data,
    rules: rulesQ.data ?? [],
    achievements: achievementsQ.data ?? [],
    specialties: specialtiesQ.data ?? [],
    reputation: reputationQ.data,
    isLoading: levelQ.isLoading || rulesQ.isLoading || specialtiesQ.isLoading || reputationQ.isLoading,
    refetch: () => {
      levelQ.refetch();
      achievementsQ.refetch();
      specialtiesQ.refetch();
      reputationQ.refetch();
    },
  };
}
