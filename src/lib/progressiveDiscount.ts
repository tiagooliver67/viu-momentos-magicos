export interface ProgressiveRule {
  min_photos: number;
  discount_pct: number;
}

/** Normalize raw JSON rules into a sorted, validated array (asc by min_photos). */
export function normalizeRules(raw: unknown): ProgressiveRule[] {
  if (!Array.isArray(raw)) return [];
  const out: ProgressiveRule[] = [];
  for (const r of raw as any[]) {
    const m = Number(r?.min_photos);
    const d = Number(r?.discount_pct);
    if (Number.isFinite(m) && Number.isFinite(d) && m > 0 && d > 0) {
      out.push({ min_photos: Math.floor(m), discount_pct: Math.min(100, d) });
    }
  }
  return out.sort((a, b) => a.min_photos - b.min_photos).slice(0, 3);
}

/** Returns the applicable rule for a given photo count, or null. */
export function findApplicableRule(rules: ProgressiveRule[], count: number): ProgressiveRule | null {
  let best: ProgressiveRule | null = null;
  for (const r of rules) {
    if (count >= r.min_photos) best = r;
  }
  return best;
}

/** Returns the next rule to unlock given current count, or null if maxed. */
export function findNextRule(rules: ProgressiveRule[], count: number): ProgressiveRule | null {
  for (const r of rules) {
    if (count < r.min_photos) return r;
  }
  return null;
}