import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Eye, ShoppingCart, CreditCard, CheckCircle2, TrendingDown, AlertTriangle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

type RangeKey = "24h" | "7d" | "30d" | "90d";

const RANGE_LABELS: Record<RangeKey, string> = {
  "24h": "Últimas 24h",
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
};

function rangeStart(key: RangeKey): string {
  const now = new Date();
  const map: Record<RangeKey, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
  now.setDate(now.getDate() - map[key]);
  return now.toISOString();
}

interface FunnelRow {
  event_type: string;
  count: number;
}

interface NoResultsRow {
  event_id: string;
  event_name: string;
  total_searches: number;
  no_result_count: number;
  no_result_pct: number;
}

interface ByKindRow {
  search_kind: string;
  total: number;
  with_results: number;
  conversion_pct: number;
}

const FUNNEL_STAGES: Array<{ key: string; label: string; icon: any; color: string }> = [
  { key: "search_performed", label: "Buscas", icon: Search, color: "bg-blue-500" },
  { key: "photo_viewed", label: "Fotos vistas", icon: Eye, color: "bg-cyan-500" },
  { key: "add_to_cart", label: "Adicionadas ao carrinho", icon: ShoppingCart, color: "bg-violet-500" },
  { key: "checkout_started", label: "Checkout iniciado", icon: CreditCard, color: "bg-amber-500" },
  { key: "purchase_completed", label: "Compras concluídas", icon: CheckCircle2, color: "bg-emerald-500" },
];

export default function AdminSearchAnalytics() {
  const [range, setRange] = useState<RangeKey>("7d");
  const startIso = useMemo(() => rangeStart(range), [range]);

  // Funil: contagem por event_type
  const { data: funnel, isLoading: loadingFunnel } = useQuery({
    queryKey: ["search-analytics-funnel", range],
    queryFn: async (): Promise<FunnelRow[]> => {
      const { data, error } = await (supabase.from("search_events") as any)
        .select("event_type")
        .gte("created_at", startIso);
      if (error) throw error;
      const counts = new Map<string, number>();
      (data || []).forEach((r: any) => counts.set(r.event_type, (counts.get(r.event_type) || 0) + 1));
      return Array.from(counts.entries()).map(([event_type, count]) => ({ event_type, count }));
    },
  });

  // Buscas sem resultado por evento
  const { data: noResults, isLoading: loadingNoResults } = useQuery({
    queryKey: ["search-analytics-no-results", range],
    queryFn: async (): Promise<NoResultsRow[]> => {
      const { data, error } = await (supabase.from("search_events") as any)
        .select("event_id, has_results")
        .eq("event_type", "search_performed")
        .gte("created_at", startIso)
        .not("event_id", "is", null);
      if (error) throw error;
      const byEvent = new Map<string, { total: number; noResult: number }>();
      (data || []).forEach((r: any) => {
        if (!r.event_id) return;
        const cur = byEvent.get(r.event_id) || { total: 0, noResult: 0 };
        cur.total += 1;
        if (r.has_results === false) cur.noResult += 1;
        byEvent.set(r.event_id, cur);
      });
      const rows = Array.from(byEvent.entries())
        .map(([event_id, v]) => ({
          event_id,
          total: v.total,
          noResult: v.noResult,
          pct: v.total > 0 ? (v.noResult / v.total) * 100 : 0,
        }))
        .filter((r) => r.noResult > 0)
        .sort((a, b) => b.noResult - a.noResult)
        .slice(0, 20);

      const ids = rows.map((r) => r.event_id);
      if (ids.length === 0) return [];
      const { data: evs } = await supabase
        .from("events")
        .select("id, name")
        .in("id", ids);
      const nameMap = new Map((evs || []).map((e: any) => [e.id, e.name]));
      return rows.map((r) => ({
        event_id: r.event_id,
        event_name: nameMap.get(r.event_id) || r.event_id.slice(0, 8),
        total_searches: r.total,
        no_result_count: r.noResult,
        no_result_pct: r.pct,
      }));
    },
  });

  // Conversão por tipo de busca
  const { data: byKind, isLoading: loadingKind } = useQuery({
    queryKey: ["search-analytics-by-kind", range],
    queryFn: async (): Promise<ByKindRow[]> => {
      const { data, error } = await (supabase.from("search_events") as any)
        .select("search_kind, has_results")
        .eq("event_type", "search_performed")
        .gte("created_at", startIso)
        .not("search_kind", "is", null);
      if (error) throw error;
      const map = new Map<string, { total: number; with_results: number }>();
      (data || []).forEach((r: any) => {
        const k = r.search_kind || "none";
        const cur = map.get(k) || { total: 0, with_results: 0 };
        cur.total += 1;
        if (r.has_results) cur.with_results += 1;
        map.set(k, cur);
      });
      return Array.from(map.entries()).map(([kind, v]) => ({
        search_kind: kind,
        total: v.total,
        with_results: v.with_results,
        conversion_pct: v.total > 0 ? (v.with_results / v.total) * 100 : 0,
      }));
    },
  });

  const funnelMap = new Map((funnel || []).map((r) => [r.event_type, r.count]));
  const maxFunnel = Math.max(1, ...FUNNEL_STAGES.map((s) => funnelMap.get(s.key) || 0));

  const overallConversion =
    funnelMap.get("purchase_completed") && funnelMap.get("search_performed")
      ? ((funnelMap.get("purchase_completed")! / funnelMap.get("search_performed")!) * 100).toFixed(2)
      : "0.00";

  const kindLabel = (k: string) => {
    if (k === "facial") return "Reconhecimento facial";
    if (k === "bib") return "Número de peito";
    if (k === "album") return "Álbum / pasta";
    return k;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-primary" />
            Funil de busca do atleta
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Da primeira busca até a compra concluída. Identifique onde o funil quebra.
          </p>
        </div>
        <div className="flex gap-2 bg-card border border-border rounded-xl p-1">
          {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                range === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {RANGE_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI overall conversion */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="text-xs text-muted-foreground">Conversão geral (busca → compra)</div>
          <div className="text-3xl font-bold mt-2">{overallConversion}%</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="text-xs text-muted-foreground">Total de buscas no período</div>
          <div className="text-3xl font-bold mt-2">{(funnelMap.get("search_performed") || 0).toLocaleString("pt-BR")}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="text-xs text-muted-foreground">Compras concluídas</div>
          <div className="text-3xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">
            {(funnelMap.get("purchase_completed") || 0).toLocaleString("pt-BR")}
          </div>
        </div>
      </div>

      {/* Funil */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Etapas do funil</h2>
        {loadingFunnel ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {FUNNEL_STAGES.map((stage, idx) => {
              const count = funnelMap.get(stage.key) || 0;
              const pct = (count / maxFunnel) * 100;
              const prevCount = idx > 0 ? funnelMap.get(FUNNEL_STAGES[idx - 1].key) || 0 : count;
              const stageConv = prevCount > 0 ? ((count / prevCount) * 100).toFixed(1) : "—";
              const Icon = stage.icon;
              return (
                <div key={stage.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      {stage.label}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono tabular-nums">{count.toLocaleString("pt-BR")}</span>
                      {idx > 0 && (
                        <span className="text-xs text-muted-foreground w-14 text-right">{stageConv}%</span>
                      )}
                    </span>
                  </div>
                  <div className="h-8 bg-muted rounded-lg overflow-hidden">
                    <div
                      className={`${stage.color} h-full transition-all duration-500 rounded-lg`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: por tipo + sem resultado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversão por tipo de busca */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Taxa de acerto por tipo de busca</h2>
          {loadingKind ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (byKind || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
          ) : (
            <div className="space-y-3">
              {byKind!.map((r) => (
                <div key={r.search_kind} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{kindLabel(r.search_kind)}</span>
                    <span className="text-muted-foreground">
                      {r.with_results}/{r.total} · <span className="font-mono">{r.conversion_pct.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${r.conversion_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top eventos com buscas sem resultado */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Eventos com buscas sem retorno
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Atletas buscando e não encontrando — evento pouco indexado ou faltando fotógrafo.
          </p>
          {loadingNoResults ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (noResults || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma busca sem resultado no período. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left font-medium px-6 py-2">Evento</th>
                    <th className="text-right font-medium px-3 py-2">Sem resultado</th>
                    <th className="text-right font-medium px-6 py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {noResults!.map((r) => (
                    <tr key={r.event_id} className="border-b border-border/50 last:border-0">
                      <td className="px-6 py-2.5">
                        <Link to={`/eventos/${r.event_id}`} className="hover:text-primary transition-colors">
                          {r.event_name}
                        </Link>
                      </td>
                      <td className="text-right font-mono tabular-nums px-3 py-2.5">
                        {r.no_result_count}/{r.total_searches}
                      </td>
                      <td className="text-right font-mono tabular-nums px-6 py-2.5">
                        <span className={r.no_result_pct >= 50 ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}>
                          {r.no_result_pct.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}