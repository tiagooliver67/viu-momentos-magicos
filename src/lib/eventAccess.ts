import { supabase } from "@/integrations/supabase/client";

const storageKey = (eventId: string) => `viufoto_event_access_${eventId}`;

export interface EventAccessGrant {
  token: string;
  expires_at: string;
}

export function getStoredAccess(eventId: string | undefined): EventAccessGrant | null {
  if (!eventId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(eventId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EventAccessGrant;
    if (!parsed?.token || !parsed?.expires_at) return null;
    if (new Date(parsed.expires_at).getTime() < Date.now()) {
      window.localStorage.removeItem(storageKey(eventId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function storeAccess(eventId: string, grant: EventAccessGrant) {
  try {
    window.localStorage.setItem(storageKey(eventId), JSON.stringify(grant));
  } catch {
    /* ignore */
  }
}

export function clearAccess(eventId: string) {
  try {
    window.localStorage.removeItem(storageKey(eventId));
  } catch {
    /* ignore */
  }
}

/** Valida a senha no servidor. Retorna o token de acesso ou null (mensagem sempre genérica). */
export async function verifyEventPassword(eventId: string, password: string): Promise<EventAccessGrant | null> {
  const { data, error } = await supabase.functions.invoke("event-access", {
    body: { action: "verify", event_id: eventId, password },
  });
  if (error || !data?.ok || !data?.token) return null;
  const grant: EventAccessGrant = { token: data.token, expires_at: data.expires_at };
  storeAccess(eventId, grant);
  return grant;
}

/** Busca fotos e vídeos de um evento protegido usando o token de acesso. */
export async function fetchProtectedGallery(eventId: string, token: string) {
  const { data, error } = await supabase.functions.invoke("event-access", {
    body: { action: "gallery", event_id: eventId, token },
  });
  if (error || !data?.ok) {
    clearAccess(eventId);
    throw new Error("access_denied");
  }
  return { photos: (data.photos ?? []) as any[], videos: (data.videos ?? []) as any[] };
}

/** Define (ou remove, com password = null) a senha do evento. Somente o organizador. */
export async function setEventPassword(eventId: string, password: string | null) {
  const { data, error } = await supabase.functions.invoke("event-access", {
    body: { action: "set_password", event_id: eventId, password },
  });
  if (error || !data?.ok) {
    throw new Error(data?.message || "Não foi possível salvar a senha do evento.");
  }
  return data.has_password as boolean;
}