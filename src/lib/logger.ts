/**
 * Structured logger for ViuFoto frontend.
 * Emits JSON-shaped events. INFO is silenced in production; WARN/ERROR always logged.
 * Critical errors can also be shipped to the `client-log` edge function for server-side capture.
 */
import { supabase } from "@/integrations/supabase/client";

export type LogLevel = "info" | "warn" | "error";
export type LogComponent =
  | "ocr"
  | "search"
  | "frontend"
  | "image-processor"
  | "checkout"
  | "auth";

export interface LogContext {
  eventId?: string;
  photoId?: string;
  component?: LogComponent;
  [key: string]: unknown;
}

const IS_PROD = import.meta.env.PROD;

export function log(level: LogLevel, event: string, ctx: LogContext = {}) {
  const payload = {
    level,
    event,
    ts: new Date().toISOString(),
    component: ctx.component ?? "frontend",
    ...ctx,
  };

  if (IS_PROD && level === "info") return;

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * Ship a critical error to the server (`client-log` edge function).
 * Fire-and-forget. Never throws. Auto-throttled per session by event name.
 */
const _shipped = new Map<string, number>();
const SHIP_COOLDOWN_MS = 30_000;

export function reportError(event: string, ctx: LogContext = {}) {
  log("error", event, ctx);
  const key = `${event}:${ctx.eventId ?? ""}:${ctx.photoId ?? ""}`;
  const last = _shipped.get(key) ?? 0;
  if (Date.now() - last < SHIP_COOLDOWN_MS) return;
  _shipped.set(key, Date.now());

  try {
    void supabase.functions.invoke("client-log", {
      body: {
        level: "error",
        event,
        component: ctx.component ?? "frontend",
        eventId: ctx.eventId,
        photoId: ctx.photoId,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        ua: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        ctx,
      },
    });
  } catch {
    /* swallow — logging must never break the app */
  }
}