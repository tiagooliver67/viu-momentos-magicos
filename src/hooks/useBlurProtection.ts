import { useIsMobile } from "@/hooks/use-mobile";
import type { BlurPattern } from "@/components/BlurProtectionOverlay";

interface BlurConfigSource {
  blur_protection_enabled?: boolean | null;
  blur_protection_pattern?: string | null;
  blur_protection_devices?: string | null;
}

/**
 * Decide se a proteção por desfoque deve ser aplicada no dispositivo atual.
 */
export function useBlurProtection(site: BlurConfigSource | null | undefined) {
  const isMobile = useIsMobile();
  const enabled = !!site?.blur_protection_enabled;
  const devices = site?.blur_protection_devices || "mobile";
  const active = enabled && (devices === "all" || isMobile);
  const pattern = (site?.blur_protection_pattern || "faixa") as BlurPattern;
  return { blurActive: active, blurPattern: pattern };
}