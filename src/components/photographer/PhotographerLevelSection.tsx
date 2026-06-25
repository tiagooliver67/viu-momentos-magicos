import { usePhotographerLevel } from "@/hooks/usePhotographerLevel";
import { LEVEL_ICONS, LEVEL_LABELS } from "@/lib/levels";
import { Trophy } from "lucide-react";

interface Props { userId: string | undefined }

export default function PhotographerLevelSection({ userId }: Props) {
  const { level, rules, achievements, isLoading } = usePhotographerLevel(userId);
  if (!userId || isLoading || !level) return null;

  const unlocked = achievements.filter((a) => a.unlocked);
  const currentRule = rules.find((r) => r.level === level.current_level);
  // Hide section when nothing meaningful to show
  if (level.current_level === "bronze" && unlocked.length === 0 && !level.is_ambassador) return null;

  return (
    <section className="container mx-auto px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Nível & Conquistas</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-4xl">{LEVEL_ICONS[level.current_level]}</div>
          <div>
            <p className="text-xs text-muted-foreground">Nível atual</p>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-foreground">{LEVEL_LABELS[level.current_level]}</span>
              {level.is_ambassador && level.current_level !== "embaixador" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">👑 Embaixador</span>
              )}
            </div>
            {currentRule?.message && (
              <p className="text-xs text-muted-foreground italic mt-1">"{currentRule.message}"</p>
            )}
          </div>
        </div>

        {unlocked.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Conquistas desbloqueadas
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {unlocked.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center"
                  title={a.description ?? undefined}
                >
                  <div className="text-2xl mb-1">{a.icon || "🏅"}</div>
                  <p className="text-xs font-semibold leading-tight text-foreground">{a.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}