export type WatermarkMode = "single" | "repeat" | "fill";

export type WatermarkPosition =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export interface WatermarkLayer {
  id: string;
  name: string;
  imageUrl?: string;
  mode: WatermarkMode;
  size: number;      // % da largura da foto
  opacity: number;   // 0-100
  rotation: number;  // graus
  position: WatermarkPosition;
  spacing: number;   // px entre repetições (modo repeat)
}

export interface WatermarkTemplate {
  id: string;
  name: string;
  layers: WatermarkLayer[];
  created_at?: string;
}

export const MAX_WATERMARK_FILE_MB = 5;

/** Formato persistido no banco (watermark_configs.layers). */
export interface WatermarkLayerDb {
  id: string;
  name: string;
  image_url?: string;
  mode: "standard" | "repeated" | "full_fill";
  size: number;
  opacity: number;
  rotation: number;
  position: WatermarkPosition;
  spacing: number;
}

const MODE_TO_DB: Record<WatermarkMode, WatermarkLayerDb["mode"]> = {
  single: "standard",
  repeat: "repeated",
  fill: "full_fill",
};

const MODE_FROM_DB: Record<WatermarkLayerDb["mode"], WatermarkMode> = {
  standard: "single",
  repeated: "repeat",
  full_fill: "fill",
};

export const toDbLayers = (layers: WatermarkLayer[]): WatermarkLayerDb[] =>
  layers.map(l => ({
    id: l.id,
    name: l.name,
    image_url: l.imageUrl,
    mode: MODE_TO_DB[l.mode],
    size: l.size,
    opacity: l.opacity,
    rotation: l.rotation,
    position: l.position,
    spacing: l.spacing,
  }));

export const fromDbLayers = (layers: WatermarkLayerDb[] | null | undefined): WatermarkLayer[] =>
  (layers || []).map(l => ({
    id: l.id || crypto.randomUUID(),
    name: l.name,
    imageUrl: l.image_url,
    mode: MODE_FROM_DB[l.mode] || "single",
    size: l.size,
    opacity: l.opacity,
    rotation: l.rotation,
    position: l.position,
    spacing: l.spacing,
  }));

export const POSITIONS: WatermarkPosition[] = [
  "top-left", "top-center", "top-right",
  "middle-left", "center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
];

export const createLayer = (name: string): WatermarkLayer => ({
  id: crypto.randomUUID(),
  name,
  mode: "single",
  size: 30,
  opacity: 60,
  rotation: 0,
  position: "center",
  spacing: 40,
});

/** Modelos prontos da plataforma usados como ponto de partida. */
export const STARTER_TEMPLATES: {
  id: string; label: string; description: string; layers: () => WatermarkLayer[];
}[] = [
  {
    id: "blank",
    label: "Em branco",
    description: "Comece do zero com uma camada vazia.",
    layers: () => [createLayer("Camada 1")],
  },
  {
    id: "corner",
    label: "Assinatura no canto",
    description: "Marca discreta no canto inferior direito.",
    layers: () => [{ ...createLayer("Assinatura"), size: 22, opacity: 75, position: "bottom-right" }],
  },
  {
    id: "mosaic",
    label: "Mosaico protegido",
    description: "Repetição inclinada por toda a foto.",
    layers: () => [{ ...createLayer("Mosaico"), mode: "repeat", size: 18, opacity: 35, rotation: -30, spacing: 60 }],
  },
  {
    id: "full",
    label: "Preenchimento total",
    description: "Máxima proteção cobrindo a imagem inteira.",
    layers: () => [{ ...createLayer("Cobertura"), mode: "fill", opacity: 30 }],
  },
];
