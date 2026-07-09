import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, RefreshCw, AlertTriangle, TrendingUp, Lightbulb, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Insight = {
  resumo?: string;
  alertas?: { titulo: string; descricao: string; severidade?: string }[];
  oportunidades?: { titulo: string; descricao: string; impacto_estimado?: string }[];
  recomendacoes?: { titulo: string; descricao: string; prioridade?: string }[];
  proximo_passo?: string;
};

const MarketingInsightsTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const run = async (force = false) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("marketing-insights", { body: { force } });
      if (error) throw error;
      if ((data as any)?.error) {
        const err = (data as any).error;
        if (err === "rate_limited") toast.error("Muitas requisições. Tente novamente em instantes.");
        else if (err === "credits_exhausted") toast.error("Créditos de IA esgotados. Adicione créditos para continuar.");
        else toast.error("Não foi possível gerar insights agora.");
        return;
      }
      setInsights((data as any).insights);
      setGeneratedAt((data as any).generated_at);
      setCached(!!(data as any).cached);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao gerar insights");
    } finally {
      setLoading(false);
    }
  };

  const sevColor = (s?: string) =>
    s === "critico" ? "bg-red-500/10 text-red-600 border-red-500/20"
      : s === "warn" ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
      : "bg-blue-500/10 text-blue-600 border-blue-500/20";

  const prioColor = (p?: string) =>
    p === "alta" ? "bg-primary/10 text-primary" : p === "media" ? "bg-secondary text-foreground" : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold">IA Estratégica</h3>
          <p className="text-sm text-muted-foreground">
            Análise dos seus últimos 30 dias com alertas, oportunidades e próximos passos personalizados.
          </p>
          {generatedAt && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Gerado em {new Date(generatedAt).toLocaleString("pt-BR")} {cached && "· cache"}
            </p>
          )}
        </div>
        <button
          onClick={() => run(!!insights)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : insights ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {insights ? "Atualizar" : "Gerar insights"}
        </button>
      </div>

      {!insights && !loading && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Clique em <strong className="text-foreground">Gerar insights</strong> para receber uma análise estratégica do seu negócio.
        </div>
      )}

      {loading && !insights && (
        <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Analisando seus dados…
        </div>
      )}

      {insights && (
        <div className="space-y-5">
          {insights.resumo && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm leading-relaxed">{insights.resumo}</p>
            </div>
          )}

          {!!insights.alertas?.length && (
            <section>
              <h4 className="flex items-center gap-2 font-semibold mb-3"><AlertTriangle className="w-4 h-4" /> Alertas</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {insights.alertas.map((a, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${sevColor(a.severidade)}`}>
                    <p className="font-semibold text-sm">{a.titulo}</p>
                    <p className="text-xs mt-1 opacity-90">{a.descricao}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!!insights.oportunidades?.length && (
            <section>
              <h4 className="flex items-center gap-2 font-semibold mb-3"><TrendingUp className="w-4 h-4" /> Oportunidades</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {insights.oportunidades.map((o, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4">
                    <p className="font-semibold text-sm">{o.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1">{o.descricao}</p>
                    {o.impacto_estimado && (
                      <p className="text-[11px] mt-2 inline-flex items-center gap-1 text-primary font-semibold">
                        Impacto: {o.impacto_estimado}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {!!insights.recomendacoes?.length && (
            <section>
              <h4 className="flex items-center gap-2 font-semibold mb-3"><Lightbulb className="w-4 h-4" /> Recomendações</h4>
              <ul className="space-y-2">
                {insights.recomendacoes.map((r, i) => (
                  <li key={i} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
                    <span className={`text-[10px] font-bold uppercase rounded px-2 py-1 ${prioColor(r.prioridade)}`}>{r.prioridade || "media"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{r.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-1">{r.descricao}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {insights.proximo_passo && (
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 flex items-start gap-3">
              <ArrowRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase text-primary mb-1">Próximo passo</p>
                <p className="text-sm">{insights.proximo_passo}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketingInsightsTab;