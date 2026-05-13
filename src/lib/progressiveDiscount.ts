export interface ProgressiveRule {
  active?: boolean;
  enabled?: boolean;
  min_photos: number;
  discount_pct: number;
}

export function normalizeRules(raw: unknown): ProgressiveRule[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any) => ({
      active: r?.active !== false,
      enabled: r?.enabled !== false && r?.active !== false,
      min_photos: Number(r?.min_photos) || 0,
      discount_pct: Number(r?.discount_pct) || 0,
    }))
    .filter(r => r.enabled && r.active !== false && r.min_photos > 0 && r.discount_pct > 0)
    .sort((a, b) => a.min_photos - b.min_photos);
}

/** Returns the highest-tier discount the cart qualifies for (0 if none). */
export function pickDiscount(rules: ProgressiveRule[], photoCount: number): {
  pct: number;
  rule: ProgressiveRule | null;
  next: ProgressiveRule | null;
} {
  const sorted = normalizeRules(rules);
  let active: ProgressiveRule | null = null;
  let next: ProgressiveRule | null = null;
  for (const r of sorted) {
    if (photoCount >= r.min_photos) active = r;
    else { next = r; break; }
  }
  return { pct: active?.discount_pct || 0, rule: active, next };
}

export function maxDiscountPct(rules: ProgressiveRule[]): number {
  return normalizeRules(rules).reduce((m, r) => Math.max(m, r.discount_pct), 0);
}