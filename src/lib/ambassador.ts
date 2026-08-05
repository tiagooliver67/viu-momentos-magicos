import { supabase } from "@/integrations/supabase/client";

/** 
 * Regras oficiais do Programa Embaixador da ViuFoto. 
 * Agora integradas com o banco de dados para permitir gestão pelo Super Admin.
 */

export const PLATFORM_FEE_PCT = 10;
export const AMBASSADOR_PCT = 1.0;
export const COMMISSION_MONTHS = 12;

/** Busca as configurações globais do programa */
export async function getAmbassadorSettings() {
  const { data, error } = await supabase
    .from('ambassador_settings')
    .select('*')
    .single();
  
  if (error) {
    console.error("Erro ao buscar ambassador_settings:", error);
    return {
      default_commission_pct: 1.0,
      default_duration_months: 12,
      min_payout_amount: 50,
      is_active: true
    };
  }
  return data;
}

/** Receita líquida da ViuFoto a partir do faturamento do fotógrafo. */
export function platformRevenue(grossSales: number) {
  return (grossSales * PLATFORM_FEE_PCT) / 100;
}

/** 
 * Comissão do embaixador a partir da receita líquida da ViuFoto.
 * Agora aceita commissionPct dinâmico.
 */
export function ambassadorShare(platformRev: number, commissionPct: number = 1.0) {
  return (platformRev * commissionPct) / 100;
}

/** 
 * Calcula meses restantes baseando-se na data de expiração real do banco.
 */
export function monthsRemainingFromExpiry(expiresAt: string | null) {
  if (!expiresAt) return Infinity; // Comissão sem prazo
  
  const end = new Date(expiresAt);
  const diff = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
  return Math.max(0, Math.ceil(diff));
}

/** Legado: mantido para compatibilidade enquanto migramos componentes */
export function monthsRemaining(createdAt: string | Date) {
  const start = new Date(createdAt);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 12);
  const diff = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
  return Math.max(0, Math.ceil(diff));
}
