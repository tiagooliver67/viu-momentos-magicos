import { usePhotographerLevel } from "@/hooks/usePhotographerLevel";
import LevelBadge from "@/components/levels/LevelBadge";
import AchievementsGrid from "@/components/levels/AchievementsGrid";
import LevelProgressCard from "@/components/levels/LevelProgressCard";
import { LEVEL_ICONS, LEVEL_LABELS, formatBRL, type LevelKey } from "@/lib/levels";
import { Loader2, Check, ChevronDown, Lock } from "lucide-react";
import { useState } from "react";

export default function MeuNivel() {
  const { level, rules, achievements, isLoading } = usePhotographerLevel();
  const [openLevel, setOpenLevel] = useState<LevelKey | null>(null);

  if (isLoading || !level) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentRule = rules.find((r) => r.level === level.current_level);
  const currentOrder = currentRule?.sort_order ?? 1;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Nível & Conquistas</h2>
        <p className="text-sm text-muted-foreground mt-1">Sua evolução dentro da Viu Foto</p>
      </div>

      {/* Card grande do nível atual */}
      <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-5xl">
            {LEVEL_ICONS[level.current_level]}
          </div>
          <div className="flex-1 min-w-0 w-full">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <LevelBadge level={level.current_level} size="lg" />
              {level.is_ambassador && level.current_level !== "embaixador" && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">👑 Embaixador</span>
              )}
            </div>
            {currentRule?.message && <p className="text-sm italic text-muted-foreground mb-4">"{currentRule.message}"</p>}

            <div className="grid grid-cols-3 gap-3 text-center my-4">
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                <p className="text-xl font-bold text-foreground">{level.events_count}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Eventos</p>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                <p className="text-xl font-bold text-foreground">{level.sales_count}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Vendas</p>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                <p className="text-base md:text-xl font-bold text-foreground">{formatBRL(Number(level.revenue_total))}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Faturado</p>
              </div>
            </div>

            {currentRule && currentRule.benefits.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Seus benefícios:</p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                  {currentRule.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-foreground">{b}</span>
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
      <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4 text-foreground">Conquistas</h3>
        <AchievementsGrid achievements={achievements} />
      </div>

      {/* Histórico */}
      {Array.isArray(level.history) && level.history.length > 0 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4 text-foreground">Histórico de evolução</h3>
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

      {/* Todos os níveis (clicáveis) */}
      <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Todos os níveis</h3>
          <p className="text-xs text-muted-foreground">Toque para ver os benefícios</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules
            .filter((r) => !r.manual_only)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((r) => {
              const reached = currentOrder >= r.sort_order;
              const isOpen = openLevel === r.level;
              return (
                <button
                  key={r.level}
                  type="button"
                  onClick={() => setOpenLevel(isOpen ? null : r.level)}
                  className={`text-left rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                    isOpen
                      ? "border-primary bg-primary/5 shadow-md"
                      : reached
                      ? "border-primary/30 bg-primary/[0.03]"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <LevelBadge level={r.level} size="sm" />
                    <div className="flex items-center gap-1.5">
                      {reached ? (
                        <span className="text-[10px] font-bold uppercase text-primary flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Conquistado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Bloqueado
                        </span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Critérios ({r.match_mode === "or" ? "qualquer um" : "todos"}):
                  </p>
                  <ul className="text-xs mt-1 space-y-0.5 text-foreground/80">
                    {r.min_events > 0 && <li>• {r.min_events} eventos</li>}
                    {r.min_sales > 0 && <li>• {r.min_sales} vendas</li>}
                    {r.min_revenue > 0 && <li>• {formatBRL(r.min_revenue)} faturados</li>}
                    {r.requires_profile_complete && <li>• Perfil completo</li>}
                    {r.requires_document && <li>• Documento validado</li>}
                  </ul>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in slide-in-from-top-2 duration-200">
                      {r.message && (
                        <p className="text-xs italic text-muted-foreground mb-3">"{r.message}"</p>
                      )}
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        Benefícios do nível {LEVEL_LABELS[r.level]}:
                      </p>
                      {r.benefits && r.benefits.length > 0 ? (
                        <ul className="space-y-1.5">
                          {r.benefits.map((b) => (
                            <li key={b} className="flex items-start gap-2 text-sm">
                              <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-foreground">{b}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Sem benefícios cadastrados.
                        </p>
                      )}
                      {r.commission_pct > 0 && (
                        <p className="text-xs text-muted-foreground mt-3">
                          Comissão de indicação:{" "}
                          <strong className="text-primary">{r.commission_pct}%</strong>
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}