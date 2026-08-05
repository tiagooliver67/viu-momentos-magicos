import { usePhotographerLevel, type PhotographerSpecialty } from "@/hooks/usePhotographerLevel";
import LevelBadge from "@/components/levels/LevelBadge";
import AchievementsGrid from "@/components/levels/AchievementsGrid";
import LevelProgressCard from "@/components/levels/LevelProgressCard";
import { LEVEL_ICONS, LEVEL_LABELS, formatBRL, type LevelKey } from "@/lib/levels";
import { Loader2, Check, ChevronDown, Lock, Star, Trophy, Shield, Info } from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageTitle, PageSubtitle, SectionTitle, CardTitle } from "@/components/ui/Typography";

export default function MeuNivel() {
  const { level, rules, achievements, specialties, reputation, isLoading } = usePhotographerLevel();
  const [openLevel, setOpenLevel] = useState<LevelKey | null>(null);
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);

  if (isLoading || !level) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentRule = rules.find((r) => r.level === level.current_level);
  const currentOrder = currentRule?.sort_order ?? 1;

  // Filter levels to remove Ambassador and Indication 1% logic (handled in migration, UI cleanup here)
  const mainLevels = rules
    .filter((r) => !r.manual_only && r.level !== ("embaixador" as any))
    .sort((a, b) => a.sort_order - b.sort_order);

  // Filter specialties: conquered vs in progress
  const conqueredSpecialties = specialties.filter((s) => s.unlocked_at !== null);
  const inProgressSpecialties = specialties.filter((s) => s.unlocked_at === null && s.events_count > 0);
  const displayedInProgress = showAllSpecialties ? inProgressSpecialties : inProgressSpecialties.slice(0, 3);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <PageTitle>Nível & Conquistas</PageTitle>
        <PageSubtitle className="mt-1">Sua jornada profissional na Viu Foto</PageSubtitle>
      </div>

      {/* 1. Minha Reputação & Nível Atual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 rounded-2xl bg-card border border-border shadow-sm p-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-5xl">
              {LEVEL_ICONS[level.current_level]}
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <LevelBadge level={level.current_level} size="lg" />
              </div>
              {currentRule?.message && <p className="text-sm italic text-muted-foreground mb-4">"{currentRule.message}"</p>}

              <div className="grid grid-cols-3 gap-3 text-center my-4">
                <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                  <p className="text-xl font-bold text-foreground">{level.eligible_events_count ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Eventos elegíveis</p>
                </div>
                <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                  <p className="text-xl font-bold text-foreground">{level.attended_participations_count ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Participações atendidas</p>
                </div>
                <div className="rounded-xl bg-muted/40 border border-border/50 p-3">
                  <p className="text-base md:text-xl font-bold text-foreground">{formatBRL(Number(level.eligible_revenue_total ?? 0))}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Faturamento elegível</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco Minha Reputação */}
        <div className="rounded-2xl bg-card border border-border shadow-sm p-6 flex flex-col justify-center text-center">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Minha Reputação</h3>
          <div className="flex justify-center mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${star <= Math.round(reputation?.rating_avg || 0) ? "text-yellow-400 fill-yellow-400" : "text-muted border-muted"}`}
              />
            ))}
          </div>
          <div className="text-4xl font-black text-foreground mb-1">{reputation?.score || 0}</div>
          <p className="text-xs text-muted-foreground">Índice de Reputação</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mt-4 flex items-center justify-center gap-1 text-[10px] text-primary cursor-help">
                  <Info className="w-3 h-3" /> Como é calculado?
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px] text-xs">
                Calculado com base em avaliações, vendas, taxa de resposta, qualidade das fotos e tempo de plataforma.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 2. Progresso do Próximo Nível */}
      <LevelProgressCard />

      {/* 3. Status Especial: Embaixador (Card Próprio) */}
      {level.is_ambassador && (
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-3xl">⭐</div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-foreground">Status: Embaixador Oficial</h3>
            <p className="text-sm text-muted-foreground">Representante oficial da ViuFoto. Convidado exclusivo pela nossa equipe.</p>
          </div>
          <a
            href="/dashboard/embaixador"
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
          >
            Painel do Embaixador
          </a>
        </div>
      )}

      {/* 4. Especialidades (Nova Seção) */}
      <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-foreground">Especialidades</h3>
          <p className="text-sm text-muted-foreground">Construa sua reputação em diferentes modalidades.</p>
        </div>

        {specialties.length === 0 ? (
          <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border">
            <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground italic">
              Publique seu primeiro evento para iniciar uma especialização.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Especialidades Conquistadas */}
            {conqueredSpecialties.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Conquistadas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {conqueredSpecialties.map((s) => (
                    <div
                      key={s.id}
                      className="group relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm hover:shadow-md transition-all animate-in fade-in zoom-in-95 duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl shadow-inner">
                          {s.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{s.title}</span>
                            <div className="bg-primary text-primary-foreground text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                              Desbloqueado
                            </div>
                          </div>
                          <p className="text-xs text-primary font-semibold">{s.level} em {s.title}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Em Desenvolvimento */}
            {inProgressSpecialties.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Em Desenvolvimento</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedInProgress.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-border bg-muted/20 p-5 opacity-80"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center text-2xl grayscale opacity-50">
                          {s.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-foreground block">{s.title}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">Jornada Inicial</span>
                        </div>
                        <div className="text-xs font-bold text-primary">{s.progress}%</div>
                      </div>
                      <Progress value={s.progress} className="h-1.5 bg-background" />
                      <div className="mt-3 flex justify-between items-center text-[10px] text-muted-foreground">
                        <span>{s.events_count}/{s.min_events} eventos</span>
                        <span>{s.photos_sold_count}/{s.min_photos_sold} vendas</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {inProgressSpecialties.length > 3 && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setShowAllSpecialties(!showAllSpecialties)}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {showAllSpecialties ? "Ver menos" : `Ver todas as especializações (${inProgressSpecialties.length})`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Conquistas Tradicionais */}
      <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
        <h3 className="font-semibold mb-4 text-foreground">Conquistas Extras</h3>
        <AchievementsGrid achievements={achievements} />
      </div>

      {/* 6. Histórico de Evolução */}
      {Array.isArray(level.history) && level.history.length > 0 && (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
          <h3 className="font-semibold mb-4 text-foreground">Histórico de Nível</h3>
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

      {/* 7. Todos os níveis (Bronze a Diamante) */}
      <div className="rounded-2xl bg-card border border-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Tabela de Níveis</h3>
          <p className="text-xs text-muted-foreground">Clique para ver os critérios e benefícios</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mainLevels.map((r) => {
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
                    {(r.min_eligible_events || r.min_events) > 0 && <li>• {r.min_eligible_events || r.min_events} eventos elegíveis</li>}
                    {(r.min_attended_participations ?? 0) > 0 && <li>• {r.min_attended_participations} participações atendidas</li>}
                    {(r.min_eligible_revenue || r.min_revenue) > 0 && <li>• {formatBRL(r.min_eligible_revenue || r.min_revenue)} faturamento elegível</li>}
                  </ul>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-border/60 animate-in fade-in slide-in-from-top-2 duration-200">
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
                          Sem benefícios extras cadastrados.
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
