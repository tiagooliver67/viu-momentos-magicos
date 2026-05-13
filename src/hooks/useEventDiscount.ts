import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRules, findApplicableRule, findNextRule, type ProgressiveRule } from "@/lib/progressiveDiscount";

export interface EventDiscountConfig {
  enabled: boolean;
  rules: ProgressiveRule[];
}

export function useEventDiscount(eventId: string | undefined | null) {
  return useQuery<EventDiscountConfig>({
    queryKey: ["event-discount", eventId],
    enabled: !!eventId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("progressive_discount_enabled, progressive_discount_rules")
        .eq("id", eventId!)
        .maybeSingle();
      if (error) throw error;
      const rules = normalizeRules(data?.progressive_discount_rules);
      return { enabled: !!data?.progressive_discount_enabled && rules.length > 0, rules };
    },
  });
}

/** Compute discount info given a config + photo count + base subtotal. */
export function computeDiscount(
  config: EventDiscountConfig | undefined,
  photoCount: number,
  subtotal: number,
) {
  if (!config?.enabled || !config.rules.length) {
    return { applied: null as ProgressiveRule | null, next: null as ProgressiveRule | null, discountValue: 0, finalTotal: subtotal };
  }
  const applied = findApplicableRule(config.rules, photoCount);
  const next = findNextRule(config.rules, photoCount);
  const pct = applied?.discount_pct ?? 0;
  const discountValue = +(subtotal * (pct / 100)).toFixed(2);
  return { applied, next, discountValue, finalTotal: +(subtotal - discountValue).toFixed(2) };
}

export { findApplicableRule, findNextRule };