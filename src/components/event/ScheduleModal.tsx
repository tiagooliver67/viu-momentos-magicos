import { useState, useEffect } from "react";
import { X, CalendarClock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (publishAtISO: string) => void;
  initial?: string | null;
  isSaving?: boolean;
}

// Formata Date para o valor esperado pelo <input type="datetime-local"> em horário local.
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleModal({ open, onClose, onConfirm, initial, isSaving }: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const base = initial ? new Date(initial) : new Date(Date.now() + 60 * 60 * 1000);
    setValue(toLocalInput(base));
  }, [open, initial]);

  if (!open) return null;

  const minValue = toLocalInput(new Date(Date.now() + 60 * 1000));

  const handleConfirm = () => {
    if (!value) return;
    const dt = new Date(value);
    if (isNaN(dt.getTime())) return;
    if (dt.getTime() <= Date.now()) return;
    onConfirm(dt.toISOString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-lg">Agendar publicação</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Escolha a data e a hora em que este evento deve ficar <strong className="text-foreground">ATIVO</strong> automaticamente.
          Até lá ele permanece oculto do público.
        </p>

        <label className="text-xs text-muted-foreground">Publicar em</label>
        <input
          type="datetime-local"
          value={value}
          min={minValue}
          onChange={(e) => setValue(e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
        />

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border border-border text-foreground text-sm font-medium min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSaving || !value}
            className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-bold min-h-[44px] disabled:opacity-50"
          >
            {isSaving ? "Agendando..." : "Confirmar agendamento"}
          </button>
        </div>
      </div>
    </div>
  );
}