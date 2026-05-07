import type { Database } from "@/integrations/supabase/types";

export type RegistrationEvent = Database["public"]["Tables"]["registration_events"]["Row"];
export type EventRegistration = Database["public"]["Tables"]["event_registrations"]["Row"];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function randomSuffix(len = 4): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export function formatDateTime(d: string | null, t: string | null): string {
  if (!d) return "";
  const dt = formatDate(d);
  return t ? `${dt} • ${t.slice(0, 5)}` : dt;
}

export const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
  pendente: "Pendente",
  pago: "Pago",
  presente: "Presente",
  ausente: "Ausente",
};