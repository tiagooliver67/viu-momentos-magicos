import { LEVEL_COLORS, LEVEL_ICONS, LEVEL_LABELS, type LevelKey } from "@/lib/levels";

export default function LevelBadge({ level, size = "md" }: { level: LevelKey; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold text-white bg-gradient-to-r ${LEVEL_COLORS[level]} ${sizes[size]} shadow-sm`}
    >
      <span>{LEVEL_ICONS[level]}</span>
      <span>{LEVEL_LABELS[level]}</span>
    </span>
  );
}