import { usePhotographerLevel } from "@/hooks/usePhotographerLevel";
import { LEVEL_LABELS, type LevelKey } from "@/lib/levels";
import { Trophy, Medal, Sparkles, Crown, Gem, Award, Star, Shield } from "lucide-react";

interface Props { userId: string | undefined }

const LEVEL_GRADIENTS: Record<string, string> = {
  bronze: "from-amber-700 to-amber-500",
  prata: "from-slate-400 to-slate-200",
  ouro: "from-yellow-500 to-amber-300",
  diamante: "from-cyan-400 to-blue-500",
  embaixador: "from-primary to-violet-400",
};

const LEVEL_ICON_COMPONENTS: Record<string, React.ElementType> = {
  bronze: Award,
  prata: Medal,
  ouro: Trophy,
  diamante: Gem,
  embaixador: Crown,
};

export default function PhotographerLevelSection({ userId }: Props) {
  const { level, rules, achievements, specialties, reputation, isLoading } = usePhotographerLevel(userId);
  if (!userId || isLoading || !level) return null;

  const unlocked = achievements.filter((a) => a.unlocked);
  const currentRule = rules.find((r) => r.level === level.current_level);
  // Hide section when nothing meaningful to show
  if (level.current_level === "bronze" && unlocked.length === 0 && !level.is_ambassador) return null;

  const unlockedSpecialties = specialties.filter(s => s.unlocked_at !== null);
  const LevelIcon = LEVEL_ICON_COMPONENTS[level.current_level] ?? Shield;
  const levelGradient = LEVEL_GRADIENTS[level.current_level] ?? "from-slate-500 to-slate-300";
  const levelLabel = (LEVEL_LABELS as Record<string, string>)[level.current_level]
    ?? String(level.current_level || "").replace(/^./, (c) => c.toUpperCase());

  return (
    <section className="container mx-auto px-4 py-6">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow)]">
          <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
            {/* 1. Reputation Index (New Focus) */}
            <div className="flex items-center gap-4 min-w-[180px]">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-foreground leading-none">{reputation?.score || 0}</span>
                <span className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Reputação</span>
              </div>
              <div className="min-w-0">
                <div className="flex mb-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${star <= Math.round(reputation?.rating_avg || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted"}`}
                    />
                  ))}
                </div>
                <h4 className="text-xs font-bold text-foreground">Credibilidade ViuFoto</h4>
                <p className="text-[10px] text-muted-foreground">Baseada em vendas e avaliações</p>
              </div>
            </div>

            <div className="hidden md:block w-px h-12 bg-border" />

            {/* 2. Level & Ambassador Status */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${levelGradient} flex items-center justify-center text-white shadow-sm`}
              >
                <LevelIcon className="w-6 h-6" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground truncate">
                    Nível {levelLabel}
                  </h3>
                  {level.is_ambassador && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      ⭐ EMBAIXADOR
                    </span>
                  )}
                </div>
                {currentRule?.message && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">
                    "{currentRule.message}"
                  </p>
                )}
              </div>
            </div>

            <div className="hidden md:block w-px h-12 bg-border" />

            {/* 3. Specialized Expertise (Conquered Specialties) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Especialidades Reconhecidas
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {unlockedSpecialties.length > 0 ? (
                  unlockedSpecialties.slice(0, 3).map((s) => (
                    <div
                      key={s.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-foreground text-[10px] font-bold"
                    >
                      <span>{s.icon}</span>
                      <span>{s.title}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">Em evolução...</span>
                )}
                {unlockedSpecialties.length > 3 && (
                  <span className="text-[10px] font-bold text-muted-foreground">+{unlockedSpecialties.length - 3}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

