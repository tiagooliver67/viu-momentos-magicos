import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Loader2, Search, Image as ImageIcon, Server, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Snapshot = {
  generated_at: string;
  ocr: {
    total: number; processed: number; pending: number;
    errors: number; errors_24h: number; success_rate: number;
    last_updated_at: string | null;
  };
  image_processor: { total_photos: number; with_derivatives_estimate: number };
  search: { indexed_bib_rows: number; note?: string };
  infra: { sqs_configured: boolean; note?: string };
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

const Stat = ({ label, value, accent }: { label: string; value: string | number; accent?: string }) => (
  <div className="bg-background/60 rounded-lg p-3">
    <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className={`text-xl font-bold ${accent ?? "text-foreground"}`}>{value}</p>
  </div>
);

const AdminHealth = () => {
  const { data, isLoading, error, refetch, isFetching } = useQuery<Snapshot>({
    queryKey: ["admin-health-snapshot"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("health-snapshot");
      if (error) throw error;
      return data as Snapshot;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" /> Saúde do Sistema
          </h1>
          <p className="text-sm text-muted-foreground">Observabilidade nativa — OCR, processamento de imagem, busca e infraestrutura.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center gap-1.5"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          Atualizar
        </button>
      </div>

      {isLoading && <div className="glass-card p-6 text-sm text-muted-foreground">Carregando snapshot…</div>}
      {error && (
        <div className="glass-card p-6 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Erro ao carregar snapshot.
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OCR */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" /> OCR</h2>
                <span className="text-[11px] text-muted-foreground">
                  últ. atividade: {timeAgo(data.ocr.last_updated_at)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Processadas" value={data.ocr.processed.toLocaleString("pt-BR")} accent="text-lime" />
                <Stat label="Pendentes" value={data.ocr.pending.toLocaleString("pt-BR")} />
                <Stat label="Erros (total)" value={data.ocr.errors.toLocaleString("pt-BR")} accent={data.ocr.errors > 0 ? "text-destructive" : undefined} />
                <Stat label="Erros 24h" value={data.ocr.errors_24h.toLocaleString("pt-BR")} accent={data.ocr.errors_24h > 0 ? "text-amber-500" : undefined} />
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                <span className="text-muted-foreground">Taxa de sucesso</span>
                <span className="font-bold text-primary">{data.ocr.success_rate}%</span>
              </div>
            </div>

            {/* Busca */}
            <div className="glass-card p-5 space-y-3">
              <h2 className="font-bold flex items-center gap-2"><Search className="w-4 h-4 text-primary" /> Busca por Número</h2>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Bibs indexados" value={data.search.indexed_bib_rows.toLocaleString("pt-BR")} accent="text-primary" />
                <Stat label="Status" value="OK" accent="text-lime" />
              </div>
              {data.search.note && (
                <p className="text-[11px] text-muted-foreground border-t border-border pt-2">{data.search.note}</p>
              )}
            </div>

            {/* Processamento de imagem */}
            <div className="glass-card p-5 space-y-3">
              <h2 className="font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-primary" /> Processamento de Imagem</h2>
              <div className="grid grid-cols-2 gap-2">
                <Stat label="Fotos totais" value={data.image_processor.total_photos.toLocaleString("pt-BR")} />
                <Stat label="Com derivados (est.)" value={data.image_processor.with_derivatives_estimate.toLocaleString("pt-BR")} accent="text-lime" />
              </div>
              <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                Falhas de geração thumb/medium são monitoradas via CloudWatch da Lambda de imagem.
              </p>
            </div>

            {/* Infra */}
            <div className="glass-card p-5 space-y-3">
              <h2 className="font-bold flex items-center gap-2"><Server className="w-4 h-4 text-primary" /> Infraestrutura</h2>
              <div className="flex items-center gap-2 text-sm">
                {data.infra.sqs_configured ? (
                  <><CheckCircle2 className="w-4 h-4 text-lime" /> SQS configurado</>
                ) : (
                  <><AlertTriangle className="w-4 h-4 text-amber-500" /> SQS não configurado</>
                )}
              </div>
              {data.infra.note && (
                <p className="text-[11px] text-muted-foreground border-t border-border pt-2">{data.infra.note}</p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-right">
            Snapshot gerado em {new Date(data.generated_at).toLocaleString("pt-BR")} · atualiza a cada 30s
          </p>
        </>
      )}
    </div>
  );
};

export default AdminHealth;