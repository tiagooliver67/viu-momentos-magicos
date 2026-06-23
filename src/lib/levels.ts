export type LevelKey = "bronze" | "prata" | "ouro" | "diamante" | "embaixador";

export interface LevelRule {
  level: LevelKey;
  sort_order: number;
  min_events: number;
  min_sales: number;
  min_revenue: number;
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
  if (next.min_events > 0) parts.push(Math.min(1, stats.events_count / next.min_events));
  if (next.min_sales > 0) parts.push(Math.min(1, stats.sales_count / next.min_sales));
  if (next.min_revenue > 0) parts.push(Math.min(1, Number(stats.revenue_total) / next.min_revenue));
  if (parts.length === 0) return 0;
  // OR = melhor critério; AND = pior critério (gargalo)
  const value = next.match_mode === "or" ? Math.max(...parts) : Math.min(...parts);
  return Math.round(value * 100);
}

export interface Missing {
  events?: number;
  sales?: number;
  revenue?: number;
  mode: "and" | "or";
}

export function formatMissing(stats: LevelStats, next: LevelRule | null): Missing | null {
  if (!next) return null;
  const m: Missing = { mode: next.match_mode };
  if (next.min_events > 0) m.events = Math.max(0, next.min_events - stats.events_count);
  if (next.min_sales > 0) m.sales = Math.max(0, next.min_sales - stats.sales_count);
  if (next.min_revenue > 0) m.revenue = Math.max(0, next.min_revenue - Number(stats.revenue_total));
  return m;
}

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}