import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const statusConfig = {
  ativo: { label: "ATIVO", bg: "bg-lime/90", text: "text-black" },
  em_breve: { label: "EM BREVE", bg: "bg-yellow-400/90", text: "text-black" },
  inativo: { label: "INATIVO", bg: "bg-red-500/90", text: "text-white" },
};

type Status = "ativo" | "em_breve" | "inativo";

export default function StatusDropdown({ status, onChange, disabled }: { status: Status; onChange: (s: Status) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = statusConfig[status];

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => !disabled && setOpen(!open)} className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${cfg.bg} ${cfg.text} text-xs font-bold min-h-[36px]`}>
        {cfg.label} <ChevronDown className="w-3 h-3" />
      </button>
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
