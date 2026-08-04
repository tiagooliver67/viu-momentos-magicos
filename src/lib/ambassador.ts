/** Regras oficiais do Programa Embaixador da ViuFoto. */
export const PLATFORM_FEE_PCT = 10; // comissão da ViuFoto sobre as vendas do fotógrafo
export const AMBASSADOR_PCT = 1; // participação do embaixador sobre a receita líquida da ViuFoto
export const COMMISSION_MONTHS = 12; // duração da participação por indicação

/** Receita líquida da ViuFoto a partir do faturamento do fotógrafo. */
export function platformRevenue(grossSales: number) {
  return (grossSales * PLATFORM_FEE_PCT) / 100;
}

/** Comissão do embaixador a partir da receita líquida da ViuFoto. */
export function ambassadorShare(platformRev: number) {
  return (platformRev * AMBASSADOR_PCT) / 100;
}

/** Meses restantes de comissão para uma indicação. */
export function monthsRemaining(createdAt: string | Date) {
  const start = new Date(createdAt);
  const end = new Date(start);
  end.setMonth(end.getMonth() + COMMISSION_MONTHS);
  const diff = (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
  return Math.max(0, Math.ceil(diff));
}
