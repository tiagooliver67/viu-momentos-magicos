import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface EventData {
  name: string;
  event_date: string;
  event_time: string | null;
  location: string;
  category: string;
  search_type: string[];
  visibility: boolean;
}

const categories = ["Futebol", "Futsal", "Vôlei", "Basquete", "Corrida", "Ciclismo", "Natação", "Crossfit", "Judô", "MMA", "Tênis", "Outros"];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: EventData) => void;
  initial?: Partial<EventData>;
  isSaving: boolean;
}

export default function EditEventModal({ open, onClose, onSave, initial, isSaving }: Props) {
  const [form, setForm] = useState<EventData>({
    name: "", event_date: "", event_time: "", location: "", category: "Outros", search_type: [], visibility: true,
  });

  useEffect(() => {
    if (initial) setForm(prev => ({ ...prev, ...initial }));
  }, [initial]);

  if (!open) return null;

  const set = (key: keyof EventData, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground text-lg">Editar Evento</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Nome do evento</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Data</label>
              <input type="date" value={form.event_date} onChange={e => set("event_date", e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Horário</label>
              <input type="time" value={form.event_time || ""} onChange={e => set("event_time", e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Localização</label>
            <input value={form.location} onChange={e => set("location", e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Categoria</label>
            <select value={form.category} onChange={e => set("category", e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Visibilidade</label>
            <div className="flex gap-2 mt-1">
              <button onClick={() => set("visibility", true)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${form.visibility ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>Público</button>
              <button onClick={() => set("visibility", false)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${!form.visibility ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>Privado</button>
            </div>
          </div>
        </div>

        <button onClick={() => onSave(form)} disabled={isSaving} className="w-full mt-6 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm min-h-[44px] disabled:opacity-50">
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}
