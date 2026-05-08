import type { Database } from "@/integrations/supabase/types";

export type RegistrationEvent = Database["public"]["Tables"]["registration_events"]["Row"];
export type EventRegistration = Database["public"]["Tables"]["event_registrations"]["Row"];
export type PriceTier = Database["public"]["Tables"]["registration_price_tiers"]["Row"];
export type RegistrationCategory = Database["public"]["Tables"]["registration_categories"]["Row"];
export type ShirtStock = Database["public"]["Tables"]["registration_shirt_stock"]["Row"];

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

export const SHIRT_SIZES_DEFAULT = ["PP", "P", "M", "G", "GG", "XG", "Baby Look"];

export function getActiveTier(tiers: PriceTier[], now: Date = new Date()): PriceTier | null {
  const sorted = [...tiers].sort((a, b) => a.sort_order - b.sort_order);
  return (
    sorted.find((t) => new Date(t.starts_at) <= now && new Date(t.ends_at) >= now) ?? null
  );
}

export function getNextTier(tiers: PriceTier[], now: Date = new Date()): PriceTier | null {
  const upcoming = tiers
    .filter((t) => new Date(t.starts_at) > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  return upcoming[0] ?? null;
}

export function calculateAge(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function applySeniorDiscount(
  price: number,
  birthDate: string | null,
  enabled: boolean,
  minAge: number,
): { final: number; applied: boolean } {
  if (!enabled || !birthDate) return { final: price, applied: false };
  const age = calculateAge(birthDate);
  if (age >= minAge) return { final: price * 0.5, applied: true };
  return { final: price, applied: false };
}

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Returns shirt sizes with their remaining stock.
 */
export function getShirtAvailability(
  stock: ShirtStock[],
  registrations: EventRegistration[],
): { size: string; remaining: number; total: number; sortOrder: number }[] {
  return stock
    .map((s) => {
      const used = registrations.filter((r) => r.shirt_size === s.size).length;
      return { size: s.size, total: s.quantity, remaining: Math.max(0, s.quantity - used), sortOrder: s.sort_order };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Returns categories with remaining slots.
 */
export function getCategoryAvailability(
  categories: RegistrationCategory[],
  registrations: EventRegistration[],
): { id: string; name: string; remaining: number | null; total: number | null; sortOrder: number }[] {
  return categories
    .map((c) => {
      const used = registrations.filter((r) => r.category_id === c.id || r.category === c.name).length;
      const remaining = c.max_slots != null ? Math.max(0, c.max_slots - used) : null;
      return { id: c.id, name: c.name, total: c.max_slots, remaining, sortOrder: c.sort_order };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}