import { usePhotographerLevel } from "@/hooks/usePhotographerLevel";
import { LEVEL_ICONS, LEVEL_LABELS, type LevelKey } from "@/lib/levels";
import { Trophy, Medal, Sparkles, Crown, Gem, Award } from "lucide-react";

interface Props { userId: string | undefined }

const LEVEL_GRADIENTS: Record<LevelKey, string> = {
  bronze: "from-amber-700 to-amber-500",
  prata: "from-slate-400 to-slate-200",
  ouro: "from-yellow-500 to-amber-300",
  diamante: "from-cyan-400 to-blue-500",
  embaixador: "from-fuchsia-500 to-purple-600",
};

const LEVEL_ICON_COMPONENTS: Record<LevelKey, React.ElementType> = {
  bronze: Award,
  prata: Medal,
  ouro: Trophy,
  diamante: Gem,
  embaixador: Crown,
};

export default function PhotographerLevelSection({ userId }: Props) {
  const { level, rules, achievements, isLoading } = usePhotographerLevel(userId);
  if (!userId || isLoading || !level) return null;

  const unlocked = achievements.filter((a) => a.unlocked);
  const currentRule = rules.find((r) => r.level === level.current_level);
  // Hide section when nothing meaningful to show
  if (level.current_level === "bronze" && unlocked.length === 0 && !level.is_ambassador) return null;

  const visible = unlocked.slice(0, 4);
  const remaining = unlocked.length - visible.length;
  const LevelIcon = LEVEL_ICON_COMPONENTS[level.current_level];

  return (
    <section className="container mx-auto px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow)]">
        <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
          {/* Level badge / credibility stamp */}
          <div className="flex items-center gap-4 min-w-0">
            <div
              className={`flex-shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br ${LEVEL_GRADIENTS[level.current_level]} flex items-center justify-center text-white shadow-md`}
            >
              <LevelIcon className="w-7 h-7 sm:w-8 sm:h-8" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nível na Viu Foto
                </span>
                {level.is_ambassador && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Sparkles className="w-3 h-3" /> Embaixador
                  </span>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">
                {LEVEL_LABELS[level.current_level]}
              </h3>
              {currentRule?.message && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {currentRule.message}
                </p>
              )}
            </div>
          </div>

          {/* Divider on desktop */}
          <div className="hidden md:block w-px h-12 bg-border" />

          {/* Achievements compact strip */}
          {unlocked.length > 0 ? (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Medal className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">
                  {unlocked.length} {unlocked.length === 1 ? "conquista" : "conquistas"} desbloqueada
                  {unlocked.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {visible.map((a) => (
                  <div
                    key={a.id}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-foreground text-xs font-medium"
                    title={a.description ?? undefined}
                  >
                    <span className="text-base leading-none">{a.icon || "🏅"}</span>
                    <span className="truncate max-w-[140px]">{a.title}</span>
                  </div>
                ))}
                {remaining > 0 && (
                  <div className="inline-flex items-center justify-center w-8 h-7 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
                    +{remaining}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 text-muted-foreground text-sm">
              <Trophy className="w-4 h-4" />
              <span>Em breve novas conquistas por aqui.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

