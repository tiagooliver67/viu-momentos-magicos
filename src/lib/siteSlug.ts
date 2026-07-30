import { supabase } from "@/integrations/supabase/client";

/** Domínio raiz oficial usado para os subdomínios de fotógrafos. */
export const ROOT_DOMAIN = "viufoto.com";

/** Slugs que não podem ser usados por fotógrafos (colidem com rotas do sistema). */
export const RESERVED_SLUGS = [
  "www", "app", "api", "admin", "painel", "dashboard", "mail", "blog",
  "help", "ajuda", "suporte", "status", "cdn", "static", "assets",
  "docs", "staging", "dev", "test", "preview",
];

/** Normaliza qualquer texto para o formato de slug (minúsculo, a-z0-9-). */
export function normalizeSlug(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(normalizeSlug(slug));
}

/** Valida o slug. Retorna mensagem de erro ou null se estiver ok. */
export function validateSlug(slug: string): string | null {
  const s = normalizeSlug(slug);
  if (!s) return "Informe um endereço para o seu site.";
  if (s.length < 3) return "O endereço deve ter pelo menos 3 caracteres.";
  if (s.length > 40) return "O endereço deve ter no máximo 40 caracteres.";
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(s))
    return "Use apenas letras minúsculas, números e hífen (sem espaços).";
  if (isReservedSlug(s)) return `O endereço "${s}" é reservado pelo sistema. Escolha outro.`;
  return null;
}

/** Verifica se o slug está livre (ignorando o próprio usuário, se informado). */
export async function isSlugAvailable(slug: string, ownUserId?: string): Promise<boolean> {
  const s = normalizeSlug(slug);
  if (!s || isReservedSlug(s)) return false;
  const { data } = await supabase
    .from("photographer_sites_public" as any)
    .select("user_id, slug")
    .eq("slug", s)
    .maybeSingle();
  if (!data) return true;
  return !!ownUserId && (data as any).user_id === ownUserId;
}

/**
 * Gera um slug único a partir de um nome ("Tiago Oliver" -> "tiagooliver"),
 * sufixando com número quando já existir (tiagooliver2, tiagooliver3...).
 */
export async function generateUniqueSlug(base: string, ownUserId?: string): Promise<string> {
  let root = normalizeSlug(base).replace(/-/g, "");
  if (root.length < 3) root = `fotografo${root}`;
  root = root.slice(0, 36);

  let candidate = isReservedSlug(root) ? `${root}1` : root;
  for (let i = 2; i < 100; i++) {
    if (await isSlugAvailable(candidate, ownUserId)) return candidate;
    candidate = `${root}${i}`;
  }
  return `${root}${Date.now().toString().slice(-5)}`;
}

/**
 * Extrai o slug do tenant a partir do hostname atual.
 * `tiagooliver.viufoto.com` -> "tiagooliver"; `viufoto.com`/`www.viufoto.com` -> null.
 */
export function getTenantSlugFromHostname(hostname?: string): string | null {
  const host = (hostname ?? (typeof window !== "undefined" ? window.location.hostname : ""))
    .toLowerCase()
    .replace(/:\d+$/, "");
  if (!host.endsWith(`.${ROOT_DOMAIN}`)) return null;
  const prefix = host.slice(0, -(ROOT_DOMAIN.length + 1));
  if (!prefix || prefix.includes(".")) return null;
  if (prefix === "www") return null;
  const slug = normalizeSlug(prefix);
  return slug || null;
}

/** URL pública do site do fotógrafo (subdomínio). */
export function photographerSiteUrl(slug: string): string {
  return `https://${normalizeSlug(slug)}.${ROOT_DOMAIN}`;
}
