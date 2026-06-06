import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Diag = {
  photo: any;
  paths: { original: string; thumb: string; medium: string };
  urls: { original: string | null; thumb: string | null; medium: string | null };
  checklist: {
    original_exists: boolean; thumb_exists: boolean; medium_exists: boolean;
    ocr_executed: boolean; ocr_found_number: boolean; indexed_for_search: boolean;
  };
  bibs: { number: string; confidence: number; bbox: any; detected_at: string }[];
  errors: { error_code: string; error_message: string; created_at: string; retry_count: number }[];
};

const CheckRow = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-center gap-2 text-sm">
    {ok ? <CheckCircle2 className="w-4 h-4 text-lime" /> : <XCircle className="w-4 h-4 text-destructive" />}
    <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
  </div>
);

const AdminPhotoDiagnostics = () => {
  const { photoId } = useParams<{ photoId: string }>();
  const [manualId, setManualId] = useState(photoId ?? "");

  const { data, isLoading, error, refetch } = useQuery<Diag>({
    queryKey: ["photo-diagnostics", photoId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("photo-diagnostics", {
        body: { photoId },
      });
      if (error) throw error;
      return data as Diag;
    },
    enabled: !!photoId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/admin/saude" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3 h-3" /> Saúde do Sistema
          </Link>
          <h1 className="text-2xl font-bold">Diagnóstico por Foto</h1>
          <p className="text-sm text-muted-foreground">Verifica DB, derivados S3, OCR e indexação.</p>
        </div>
      </div>

      <div className="glass-card p-4 flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs text-muted-foreground">photo_id</label>
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="uuid da foto"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
          />
        </div>
        <Link
          to={`/admin/foto/${manualId}`}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          Diagnosticar
        </Link>
      </div>

      {!photoId && (
        <div className="glass-card p-6 text-sm text-muted-foreground">
          Informe um <code>photo_id</code> acima para iniciar o diagnóstico.
        </div>
      )}

      {isLoading && (
        <div className="glass-card p-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      )}

      {error && (
        <div className="glass-card p-6 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Falha ao carregar diagnóstico.
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Resumo */}
          <div className="glass-card p-5 space-y-3 lg:col-span-2">
            <h2 className="font-bold">Resumo</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-muted-foreground">photo_id:</span><br /><code className="text-[11px]">{data.photo.id}</code></div>
              <div><span className="text-muted-foreground">event_id:</span><br /><code className="text-[11px]">{data.photo.event_id}</code></div>
              <div><span className="text-muted-foreground">Evento:</span><br />{data.photo.event_name ?? "—"}</div>
              <div><span className="text-muted-foreground">Status indexação:</span><br /><span className="font-bold">{data.photo.indexing_status}</span></div>
              <div><span className="text-muted-foreground">Upload em:</span><br />{new Date(data.photo.created_at).toLocaleString("pt-BR")}</div>
              <div><span className="text-muted-foreground">Indexado em:</span><br />{data.photo.bibs_indexed_at ? new Date(data.photo.bibs_indexed_at).toLocaleString("pt-BR") : "—"}</div>
              <div><span className="text-muted-foreground">Bibs detectados:</span><br /><span className="font-bold text-primary">{data.photo.bibs_count ?? 0}</span></div>
              <div><span className="text-muted-foreground">file_url:</span><br /><code className="text-[10px] break-all">{data.photo.file_url}</code></div>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <h3 className="text-xs font-bold uppercase text-muted-foreground">URLs Assinadas</h3>
              {(["original", "thumb", "medium"] as const).map((k) => (
                <div key={k} className="flex items-center justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{k}</span>
                  {data.urls[k] ? (
                    <a href={data.urls[k]!} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      abrir <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-destructive">indisponível</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="glass-card p-5 space-y-3">
            <h2 className="font-bold">Checklist</h2>
            <CheckRow ok={data.checklist.original_exists} label="Original existe no S3" />
            <CheckRow ok={data.checklist.thumb_exists} label="Thumb existe no S3" />
            <CheckRow ok={data.checklist.medium_exists} label="Medium existe no S3" />
            <CheckRow ok={data.checklist.ocr_executed} label="OCR executado" />
            <CheckRow ok={data.checklist.ocr_found_number} label="OCR encontrou número" />
            <CheckRow ok={data.checklist.indexed_for_search} label="Indexado para busca" />
          </div>

          {/* Bibs */}
          <div className="glass-card p-5 space-y-2 lg:col-span-2">
            <h2 className="font-bold">Números detectados</h2>
            {data.bibs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum número detectado.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr><th className="text-left py-1">Número</th><th className="text-left py-1">Confiança</th><th className="text-left py-1">Detectado em</th></tr>
                </thead>
                <tbody>
                  {data.bibs.map((b, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5 font-bold text-primary">{b.number}</td>
                      <td className="py-1.5">{Number(b.confidence).toFixed(2)}%</td>
                      <td className="py-1.5 text-muted-foreground">{new Date(b.detected_at).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Erros */}
          <div className="glass-card p-5 space-y-2">
            <h2 className="font-bold">Erros recentes</h2>
            {data.errors.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem erros registrados.</p>
            ) : (
              data.errors.map((e, i) => (
                <div key={i} className="border-t border-border pt-2 text-xs">
                  <div className="font-bold text-destructive">{e.error_code}</div>
                  <div className="text-muted-foreground break-all">{e.error_message}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")} · retries: {e.retry_count}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPhotoDiagnostics;