import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DlqData {
  ok: boolean;
  queue?: { name: string; region: string; account?: string };
  messages?: { available: number; in_flight: number; delayed: number };
  checked_at?: string;
  error?: string;
}

export const DlqStatusCard = () => {
  const [data, setData] = useState<DlqData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dlq-status");
      if (error) throw error;
      setData(data as DlqData);
    } catch (e) {
      setData({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => clearInterval(id);
  }, []);

  const total = data?.messages
    ? data.messages.available + data.messages.in_flight + data.messages.delayed
    : 0;
  const hasError = data && !data.ok;
  const hasMessages = data?.ok && total > 0;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : hasError ? (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          ) : hasMessages ? (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-lime" />
          )}
          <div>
            <h3 className="text-sm font-bold">DLQ · bib-detector</h3>
            <p className="text-[10px] text-muted-foreground">
              {data?.queue?.name || "viufoto-bib-dlq"} · {data?.queue?.region || "sa-east-1"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-50"
          title="Atualizar"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {hasError ? (
        <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
          {data?.error || "Falha ao consultar a fila"}
        </div>
      ) : data?.messages ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className={`text-lg font-bold ${data.messages.available > 0 ? "text-destructive" : "text-foreground"}`}>
                {data.messages.available}
              </p>
              <p className="text-[10px] text-muted-foreground">Disponíveis</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-lg font-bold">{data.messages.in_flight}</p>
              <p className="text-[10px] text-muted-foreground">Em processamento</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-2">
              <p className="text-lg font-bold">{data.messages.delayed}</p>
              <p className="text-[10px] text-muted-foreground">Atrasadas</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Inbox className="w-3 h-3" />
            {hasMessages
              ? "Mensagens na DLQ — verifique CloudWatch/notificação por e-mail."
              : "Fila vazia. Alarme CloudWatch ativo notifica por e-mail se algo cair aqui."}
          </div>
        </>
      ) : null}
    </div>
  );
};