import { CANONICAL_SITE_URL } from "@/lib/shareUrl";
import darkAsset from "@/assets/viu-foto-watermark-dark.png.asset.json";
import lightAsset from "@/assets/viu-foto-watermark-light.png.asset.json";
import meshAsset from "@/assets/viu-foto-watermark-mesh.png.asset.json";
import shieldAsset from "@/assets/viu-foto-watermark-shield.png.asset.json";
import type { WatermarkLayer } from "@/lib/watermarkLayers";

/** URL absoluta — usada nas camadas persistidas, pois o processamento
 *  no servidor (Lambda) precisa baixar a imagem por uma URL pública. */
const abs = (url: string) => (url.startsWith("http") ? url : `${CANONICAL_SITE_URL}${url}`);

export const PRESET_LOGO_DARK = abs(darkAsset.url);
export const PRESET_LOGO_LIGHT = abs(lightAsset.url);
/** Ladrilho com o logo repetido e linhas diagonais conectando as marcas. */
export const PRESET_MESH_TILE = abs(meshAsset.url);
/** Escudo central: logo ao centro, linhas verticais, logos laterais e hashtags. */
export const PRESET_SHIELD = abs(shieldAsset.url);

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
    name: "VIU FOTO · Escudo",
    description:
      "Logo ao centro com linhas verticais, logos suaves nas laterais e as hashtags #fotoprotegida / #protectedphoto.",
    previewUrl: shieldAsset.url,
    layers: [
      {
        id: "viufoto-assinatura-1",
        name: "Escudo VIU FOTO",
        imageUrl: PRESET_SHIELD,
        mode: "fill",
        size: 100,
        opacity: 100,
        rotation: 0,
        position: "center",
        spacing: 0,
      },
    ],
  },
  {
    id: "viufoto-mosaico",
    name: "VIU FOTO · Malha",
    description: "Logos repetidos por toda a foto, conectados por linhas diagonais. Proteção máxima.",
    previewUrl: meshAsset.url,
    layers: [
      {
        id: "viufoto-mosaico-1",
        name: "Malha VIU FOTO",
        imageUrl: PRESET_MESH_TILE,
        mode: "repeat",
        size: 45,
        opacity: 70,
        rotation: 0,
        position: "center",
        spacing: 0,
      },
    ],
  },
];

export const DEFAULT_PRESET_ID = SYSTEM_WATERMARK_PRESETS[0].id;

export const getPreset = (id?: string | null) =>
  SYSTEM_WATERMARK_PRESETS.find(p => p.id === id) ?? SYSTEM_WATERMARK_PRESETS[0];
