import { useState, useEffect } from "react";
import { X, ScanFace, Image as ImageIcon, Eye, Camera } from "lucide-react";

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

const searchTypes = [
  { key: "facial", label: "Reconhecimento Facial", icon: ScanFace, desc: "IA identifica rostos" },
  { key: "album", label: "Álbum", icon: ImageIcon, desc: "Organize por pastas" },
  { key: "numero", label: "Número de Peito", icon: Eye, desc: "OCR lê números" },
  { key: "sem", label: "Sem busca", icon: Camera, desc: "Galeria simples" },
];

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

  const toggleSearchType = (key: string) => {
    const cur = form.search_type || [];
    if (key === "sem") {
      set("search_type", cur.includes("sem") ? [] : ["sem"]);
      return;
    }
    const next = cur.includes(key) ? cur.filter(k => k !== key) : [...cur.filter(k => k !== "sem"), key];
    set("search_type", next);
  };

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
            <label className="text-xs text-muted-foreground">Tipo de busca</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {searchTypes.map(opt => {
                const active = (form.search_type || []).includes(opt.key);
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleSearchType(opt.key)}
                    className={`text-left p-3 rounded-lg border transition-all ${active ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/40"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}>{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
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
