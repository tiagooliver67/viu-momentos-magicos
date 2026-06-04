import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useIndexingProgress } from "@/hooks/useIndexingProgress";

interface Props {
  eventId: string;
}

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export const IndexingProgressCard = ({ eventId }: Props) => {
  const p = useIndexingProgress(eventId);

  if (!p || p.total_photos === 0) return null;

  const pending = Math.max(0, p.total_photos - p.bibs_done - p.bibs_errors);
  const pct = Math.round((p.bibs_done / p.total_photos) * 100);
  const isDone = pending === 0 && p.bibs_errors === 0;
  const isRunning = pending > 0;

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 mb-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-semibold">
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          ) : isDone ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span>OCR · {pct}%</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          atualizado {timeAgo(p.last_updated_at)}
        </span>
      </div>

      <Progress value={pct} className="h-1.5" />

      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
        <div className="bg-background/60 rounded px-1 py-1">
          <div className="font-bold text-foreground">{p.total_photos}</div>
          <div className="text-muted-foreground">Total</div>
        </div>
        <div className="bg-background/60 rounded px-1 py-1">
          <div className="font-bold text-lime">{p.bibs_done}</div>
          <div className="text-muted-foreground">Processadas</div>
        </div>
        <div className="bg-background/60 rounded px-1 py-1">
          <div className="font-bold text-foreground">{pending}</div>
          <div className="text-muted-foreground">Pendentes</div>
        </div>
        <div className="bg-background/60 rounded px-1 py-1">
          <div className={`font-bold ${p.bibs_errors > 0 ? "text-destructive" : "text-foreground"}`}>
            {p.bibs_errors}
          </div>
          <div className="text-muted-foreground">Erros</div>
        </div>
      </div>
    </div>
  );
};