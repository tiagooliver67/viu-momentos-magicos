import { Link } from "react-router-dom";
import { ArrowRight, Trophy } from "lucide-react";
import { usePhotographerLevel } from "@/hooks/usePhotographerLevel";
import {
  LEVEL_ICONS,
  LEVEL_LABELS,
  calculateProgress,
  formatBRL,
  formatMissing,
  getNextRule,
} from "@/lib/levels";
import LevelBadge from "./LevelBadge";

export default function LevelProgressCard() {
  const { level, rules, isLoading } = usePhotographerLevel();

  if (isLoading || !level) {
    return <div className="rounded-xl border border-border bg-card p-5 h-32 animate-pulse" />;
  }

  const next = getNextRule(rules, level.current_level);
  const progress = calculateProgress(level, next);
  const missing = formatMissing(level, next);
  const currentRule = rules.find((r) => r.level === level.current_level);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{LEVEL_ICONS[level.current_level]}</div>
          <div>
            <p className="text-xs text-muted-foreground">Seu nível atual</p>
            <div className="flex items-center gap-2 mt-0.5">
              <LevelBadge level={level.current_level} size="sm" />
              {level.is_ambassador && level.current_level !== "embaixador" && <span className="text-xs">👑 Embaixador</span>}
            </div>
            {currentRule?.message && <p className="text-xs text-muted-foreground mt-1 italic">"{currentRule.message}"</p>}
          </div>
        </div>
        <Link
          to="/dashboard/configuracoes?tab=nivel"
          className="text-xs text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
        >
          Detalhes <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {next ? (
        <>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">
              Progresso para <strong className="text-foreground">{LEVEL_ICONS[next.level]} {LEVEL_LABELS[next.level]}</strong>
            </span>
            <span className="font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {missing && (
            <p className="text-xs text-muted-foreground mt-2">
              Faltam:{" "}
              {[
                missing.eligible_events ? `${missing.eligible_events} eventos elegíveis` : null,
                missing.attended ? `${missing.attended} participações atendidas` : null,
                missing.eligible_revenue ? formatBRL(missing.eligible_revenue) + " em faturamento elegível" : null,
              ]
                .filter(Boolean)
                .join(missing.mode === "or" ? " ou " : " e ")}
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Trophy className="w-4 h-4" />
          Você atingiu o nível máximo automático!
        </div>
      )}
    </div>
  );
}