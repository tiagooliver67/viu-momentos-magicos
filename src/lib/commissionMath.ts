// Helper de cálculo da divisão de comissão entre fotógrafo e cliente.
// Espelha a fórmula usada na etapa "Monetização do Evento" em CriarEvento.tsx.
//
// Comissão total da plataforma: 10% sobre o valor base.
// O fotógrafo escolhe qual fatia ele absorve (photographerShare)
// e qual é repassada ao cliente (clientShare). Soma sempre = 10.
//
// Taxa de gateway aproximada: 4,99% sobre o valor cobrado do cliente
// (mesmo valor usado na simulação atual).

export const GATEWAY_FEE_PCT = 4.99;
export const PLATFORM_COMMISSION_PCT = 10;

export interface CommissionBreakdown {
  basePrice: number;
  clientPrice: number;        // o que o cliente paga
  platformFee: number;        // 10% sobre clientPrice
  gatewayFee: number;         // taxa do gateway sobre clientPrice
  photographerNet: number;    // líquido que o fotógrafo recebe
  marginPct: number;          // photographerNet / basePrice
}

export function computeBreakdown(
  basePrice: number,
  photographerShare = 10,
  clientShare = 0,
): CommissionBreakdown {
  const safeBase = Number.isFinite(basePrice) ? Math.max(0, basePrice) : 0;
  const cShare = Math.max(0, Math.min(PLATFORM_COMMISSION_PCT, clientShare));
  // Cliente paga base + repasse do fotógrafo
  const clientPrice = +(safeBase * (1 + cShare / 100)).toFixed(2);
  const platformFee = +(clientPrice * (PLATFORM_COMMISSION_PCT / 100)).toFixed(2);
  const gatewayFee = +(clientPrice * (GATEWAY_FEE_PCT / 100)).toFixed(2);
  const photographerNet = +(clientPrice - platformFee - gatewayFee).toFixed(2);
  const marginPct = safeBase > 0 ? +((photographerNet / safeBase) * 100).toFixed(1) : 0;
  return {
    basePrice: safeBase,
    clientPrice,
    platformFee,
    gatewayFee,
    photographerNet,
    marginPct,
  };
}

export function formatBRL(value: number) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export function describeStrategy(photographerShare: number, clientShare: number) {
  if (clientShare <= 0) return "Você absorve toda a comissão";
  if (photographerShare <= 0) return "Comissão repassada ao cliente";
  return "Comissão dividida com o cliente";
}