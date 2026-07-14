import { Camera, Film } from "lucide-react";

export type GalleryTab = "photos" | "videos";

interface Props {
  active: GalleryTab;
  onChange: (tab: GalleryTab) => void;
  photoCount: number;
  videoCount: number;
}

/**
 * Tabs premium ViuFoto: Fotos | Vídeos com contadores.
 * Mesma pílula em desktop e mobile (só o label muda para caber melhor no mobile).
 * Animação suave via transição de background/cor + underline no item ativo.
 */
export default function GalleryTabs({ active, onChange, photoCount, videoCount }: Props) {
  const tabs: {
    id: GalleryTab;
    icon: typeof Camera;
    labelDesktop: string;
    labelMobile: string;
    count: number;
  }[] = [
    {
      id: "photos",
      icon: Camera,
      labelDesktop: "Fotos",
      labelMobile: "Fotos",
      count: photoCount,
    },
    {
      id: "videos",
      icon: Film,
      labelDesktop: "Vídeos",
      labelMobile: "Vídeos",
      count: videoCount,
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Alternar entre Fotos e Vídeos"
      className="relative flex items-center gap-1 p-1 rounded-full bg-secondary/60 border border-border w-fit mb-6 sm:mb-8"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`relative flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-200 min-h-[40px] ${
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.labelDesktop}</span>
            <span className="sm:hidden">{t.labelMobile}</span>
            <span
              className={`ml-0.5 text-xs font-bold tabular-nums transition-colors ${
                isActive
                  ? "text-primary-foreground/90"
                  : "text-muted-foreground/70"
              }`}
            >
              ({t.count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
