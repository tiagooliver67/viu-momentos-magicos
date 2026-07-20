import { supabase } from "@/integrations/supabase/client";

export type SearchKind = "facial" | "bib" | "album" | "none";
export type FunnelEventType =
  | "search_performed"
  | "photo_viewed"
  | "add_to_cart"
  | "checkout_started"
  | "purchase_completed";

function getSessionId(): string {
  try {
    let id = localStorage.getItem("viufoto_session_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("viufoto_session_id", id);
    }
    return id;
  } catch {
    return "no-session";
  }
}

let cachedUserId: string | null | undefined;
async function getUserId(): Promise<string | null> {
  if (cachedUserId !== undefined) return cachedUserId ?? null;
  try {
    const { data } = await supabase.auth.getUser();
    cachedUserId = data.user?.id ?? null;
  } catch {
    cachedUserId = null;
  }
  return cachedUserId;
}

// Invalidate cache on auth change
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_evt, session) => {
    cachedUserId = session?.user?.id ?? null;
  });
}

// Simple in-memory dedupe (avoid double-fire in the same session for same key within 3s)
const recentKeys = new Map<string, number>();
function shouldSkip(key: string): boolean {
  const now = Date.now();
  const last = recentKeys.get(key);
  if (last && now - last < 3000) return true;
  recentKeys.set(key, now);
  if (recentKeys.size > 200) {
    // trim oldest
    const cutoff = now - 60_000;
    for (const [k, t] of recentKeys) if (t < cutoff) recentKeys.delete(k);
  }
  return false;
}

interface TrackArgs {
  event_type: FunnelEventType;
  search_kind?: SearchKind | null;
  event_id?: string | null;
  photo_id?: string | null;
  order_id?: string | null;
  has_results?: boolean | null;
  results_count?: number | null;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}

export async function trackFunnelEvent(args: TrackArgs): Promise<void> {
  try {
    if (args.dedupeKey && shouldSkip(`${args.event_type}:${args.dedupeKey}`)) return;
    const session_id = getSessionId();
    const user_id = await getUserId();
    // Fire-and-forget: no await on error surfaces
    await supabase.from("search_events").insert({
      event_type: args.event_type,
      search_kind: args.search_kind ?? null,
      event_id: args.event_id ?? null,
      photo_id: args.photo_id ?? null,
      order_id: args.order_id ?? null,
      has_results: args.has_results ?? null,
      results_count: args.results_count ?? null,
      session_id,
      user_id,
      metadata: args.metadata ?? {},
    });
  } catch (err) {
    // Never let tracking break UX
    if (import.meta.env.DEV) console.warn("[trackFunnelEvent]", err);
  }
}