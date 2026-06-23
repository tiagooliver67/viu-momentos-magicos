import { usePhotographerLevel } from "@/hooks/usePhotographerLevel";
import LevelBadge from "@/components/levels/LevelBadge";
import AchievementsGrid from "@/components/levels/AchievementsGrid";
import LevelProgressCard from "@/components/levels/LevelProgressCard";
import { LEVEL_ICONS, LEVEL_LABELS, formatBRL, type LevelKey } from "@/lib/levels";
import { Loader2, Check } from "lucide-react";

export default function MeuNivel() {
  const { level, rules, achievements, isLoading } = usePhotographerLevel();

  if (isLoading || !level) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentRule = rules.find((r) => r.level === level.current_level);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Nível & Conquistas</h2>
        <p className="text-sm text-muted-foreground">Sua evolução dentro da Viu Foto</p>
      </div>

      {/* Card grande do nível */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="text-6xl">{LEVEL_ICONS[level.current_level]}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <LevelBadge level={level.current_level} size="lg" />
              {level.is_ambassador && level.current_level !== "embaixador" && (
                <span className="text-sm font-semibold">👑 Embaixador</span>
              )}
            </div>
            {currentRule?.message && <p className="text-sm italic text-muted-foreground mb-3">"{currentRule.message}"</p>}

            <div className="grid grid-cols-3 gap-3 text-center my-4">
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xl font-bold">{level.events_count}</p>
                <p className="text-[11px] text-muted-foreground">Eventos</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xl font-bold">{level.sales_count}</p>
                <p className="text-[11px] text-muted-foreground">Vendas</p>
              </div>
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-xl font-bold">{formatBRL(Number(level.revenue_total))}</p>
                <p className="text-[11px] text-muted-foreground">Faturado</p>
              </div>
            </div>

            {currentRule && currentRule.benefits.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Seus benefícios:</p>
                <ul className="space-y-1">
                  {currentRule.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progresso */}
      <LevelProgressCard />

      {/* Conquistas */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">🏆 Conquistas</h3>
        <AchievementsGrid achievements={achievements} />
      </div>

      {/* Histórico */}
      {Array.isArray(level.history) && level.history.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">📜 Histórico de evolução</h3>
          <ol className="space-y-2">
            {level.history.map((h, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <LevelBadge level={h.level as LevelKey} size="sm" />
                <span className="text-muted-foreground">
                  {new Date(h.at).toLocaleDateString("pt-BR")}
                </span>
                <span className="text-foreground">Alcançou {LEVEL_LABELS[h.level as LevelKey]}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Próximos níveis */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Próximos níveis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules
            .filter((r) => !r.manual_only)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((r) => {
              const reached =
                rules.find((rr) => rr.level === level.current_level)!.sort_order >= r.sort_order;
              return (
                <div
                  key={r.level}
                  className={`rounded-xl border p-4 ${
                    reached ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <LevelBadge level={r.level} size="sm" />
                    {reached && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Critérios ({r.match_mode === "or" ? "qualquer um" : "todos"}):
                  </p>
                  <ul className="text-xs mt-1 space-y-0.5">
                    {r.min_events > 0 && <li>• {r.min_events} eventos</li>}
                    {r.min_sales > 0 && <li>• {r.min_sales} vendas</li>}
                    {r.min_revenue > 0 && <li>• {formatBRL(r.min_revenue)} faturados</li>}
                    {r.requires_profile_complete && <li>• Perfil completo</li>}
                    {r.requires_document && <li>• Documento validado</li>}
                  </ul>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}