export type LevelKey = "bronze" | "prata" | "ouro" | "diamante" | "embaixador";

export interface LevelRule {
  level: LevelKey;
  sort_order: number;
  min_events: number;
  min_sales: number;
  min_revenue: number;
  min_eligible_events: number;
  min_attended_participations: number;
  min_eligible_revenue: number;
  requires_profile_complete: boolean;
  requires_document: boolean;
  manual_only: boolean;
  match_mode: "and" | "or";
  commission_pct: number;
  benefits: string[];
  message: string | null;
}

export interface LevelStats {
  events_count: number;
  sales_count: number;
  revenue_total: number;
  referrals_count: number;
  eligible_events_count?: number;
  attended_participations_count?: number;
  eligible_revenue_total?: number;
}

export const LEVEL_LABELS: Record<LevelKey, string> = {
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
  diamante: "Diamante",
  embaixador: "Embaixador",
};

export const LEVEL_ICONS: Record<LevelKey, string> = {
  bronze: "🥉",
  prata: "🥈",
  ouro: "🥇",
  diamante: "💎",
  embaixador: "👑",
};

export const LEVEL_COLORS: Record<LevelKey, string> = {
  bronze: "from-amber-700 to-amber-500",
  prata: "from-slate-400 to-slate-200",
  ouro: "from-yellow-500 to-amber-300",
  diamante: "from-cyan-400 to-blue-500",
  embaixador: "from-fuchsia-500 to-purple-600",
};

export function getNextRule(rules: LevelRule[], current: LevelKey): LevelRule | null {
  const sorted = [...rules].filter((r) => !r.manual_only).sort((a, b) => a.sort_order - b.sort_order);
  const currentOrder = sorted.find((r) => r.level === current)?.sort_order ?? 1;
  return sorted.find((r) => r.sort_order > currentOrder) ?? null;
}

/** Returns 0–100 progress until the next level. */
export function calculateProgress(stats: LevelStats, next: LevelRule | null): number {
  if (!next) return 100;
  const parts: number[] = [];
  const eligEvents = next.min_eligible_events || next.min_events;
  const attended = next.min_attended_participations || 0;
  const eligRev = next.min_eligible_revenue || next.min_revenue;
  if (eligEvents > 0) parts.push(Math.min(1, (stats.eligible_events_count ?? 0) / eligEvents));
  if (attended > 0) parts.push(Math.min(1, (stats.attended_participations_count ?? 0) / attended));
  if (eligRev > 0) parts.push(Math.min(1, Number(stats.eligible_revenue_total ?? 0) / eligRev));
  if (parts.length === 0) return 0;
  const value = next.match_mode === "or" ? Math.max(...parts) : Math.min(...parts);
  return Math.round(value * 100);
}

export interface Missing {
  eligible_events?: number;
  attended?: number;
  eligible_revenue?: number;
  mode: "and" | "or";
}

export function formatMissing(stats: LevelStats, next: LevelRule | null): Missing | null {
  if (!next) return null;
  const m: Missing = { mode: next.match_mode };
  const eligEvents = next.min_eligible_events || next.min_events;
  const attended = next.min_attended_participations || 0;
  const eligRev = next.min_eligible_revenue || next.min_revenue;
  if (eligEvents > 0) m.eligible_events = Math.max(0, eligEvents - (stats.eligible_events_count ?? 0));
  if (attended > 0) m.attended = Math.max(0, attended - (stats.attended_participations_count ?? 0));
  if (eligRev > 0) m.eligible_revenue = Math.max(0, eligRev - Number(stats.eligible_revenue_total ?? 0));
  return m;
}

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}