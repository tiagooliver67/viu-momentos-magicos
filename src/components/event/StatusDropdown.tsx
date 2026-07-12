import { useState, useRef, useEffect } from "react";
import { ChevronDown, CalendarClock } from "lucide-react";

const statusConfig = {
  ativo:    { label: "ATIVO",    bg: "bg-lime/90",        text: "text-black" },
  agendado: { label: "AGENDADO", bg: "bg-blue-500/90",    text: "text-white" },
  em_breve: { label: "EM BREVE", bg: "bg-yellow-400/90",  text: "text-black" },
  inativo: { label: "INATIVO",   bg: "bg-red-500/90",     text: "text-white" },
};

type Status = "ativo" | "agendado" | "em_breve" | "inativo";

export default function StatusDropdown({
  status,
  onChange,
  disabled,
  publishAt,
}: {
  status: Status;
  onChange: (s: Status) => void;
  disabled?: boolean;
  publishAt?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = statusConfig[status];
  const isActive = status === "ativo";

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !disabled && setOpen(!open)}
        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${cfg.bg} ${cfg.text} text-xs font-bold min-h-[36px] transition-shadow ${
          isActive ? "ring-2 ring-lime/70 ring-offset-2 ring-offset-background shadow-[0_0_0_4px_rgba(163,230,53,0.15)]" : ""
        }`}
      >
        {isActive && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black/70 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-black" />
          </span>
        )}
        {cfg.label} <ChevronDown className="w-3 h-3" />
      </button>
      {status === "agendado" && publishAt && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <CalendarClock className="w-3 h-3" />
          Publica em {new Date(publishAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </p>
      )}
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[140px]">
          {(Object.keys(statusConfig) as Status[]).filter(s => s !== status).map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary/50 first:rounded-t-lg last:rounded-b-lg">
              {statusConfig[s].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
