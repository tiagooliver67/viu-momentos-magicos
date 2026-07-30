import { CANONICAL_SITE_URL } from "@/lib/shareUrl";
import darkAsset from "@/assets/viu-foto-watermark-dark.png.asset.json";
import lightAsset from "@/assets/viu-foto-watermark-light.png.asset.json";
import type { WatermarkLayer } from "@/lib/watermarkLayers";

/** URL absoluta — usada nas camadas persistidas, pois o processamento
 *  no servidor (Lambda) precisa baixar a imagem por uma URL pública. */
const abs = (url: string) => (url.startsWith("http") ? url : `${CANONICAL_SITE_URL}${url}`);

export const PRESET_LOGO_DARK = abs(darkAsset.url);
export const PRESET_LOGO_LIGHT = abs(lightAsset.url);

export interface WatermarkPreset {
  id: string;
  name: string;
  description: string;
  /** URL usada apenas na miniatura do card. */
  previewUrl: string;
  layers: WatermarkLayer[];
}

/** Modelos prontos da plataforma. O primeiro é o padrão de contas novas. */
export const SYSTEM_WATERMARK_PRESETS: WatermarkPreset[] = [
  {
    id: "viufoto-assinatura",
    name: "VIU FOTO · Assinatura",
    description: "Logo discreto no canto inferior direito. Boa visibilidade da foto.",
    previewUrl: darkAsset.url,
    layers: [
      {
        id: "viufoto-assinatura-1",
        name: "Assinatura VIU FOTO",
        imageUrl: PRESET_LOGO_LIGHT,
        mode: "single",
        size: 24,
        opacity: 80,
        rotation: 0,
        position: "bottom-right",
        spacing: 40,
      },
    ],
  },
  {
    id: "viufoto-mosaico",
    name: "VIU FOTO · Mosaico",
    description: "Logo repetido em diagonal por toda a foto. Proteção máxima.",
    previewUrl: darkAsset.url,
    layers: [
      {
        id: "viufoto-mosaico-1",
        name: "Mosaico VIU FOTO",
        imageUrl: PRESET_LOGO_LIGHT,
        mode: "repeat",
        size: 16,
        opacity: 32,
        rotation: -30,
        position: "center",
        spacing: 70,
      },
    ],
  },
];

export const DEFAULT_PRESET_ID = SYSTEM_WATERMARK_PRESETS[0].id;

export const getPreset = (id?: string | null) =>
  SYSTEM_WATERMARK_PRESETS.find(p => p.id === id) ?? SYSTEM_WATERMARK_PRESETS[0];
