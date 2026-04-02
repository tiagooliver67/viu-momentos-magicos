import { useState } from "react";
import { X, Lock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (password: string | null) => void;
  currentPassword?: string | null;
  isSaving: boolean;
}

export default function PasswordModal({ open, onClose, onSave, currentPassword, isSaving }: Props) {
  const [password, setPassword] = useState(currentPassword || "");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-lg">Senha do Evento</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">Defina uma senha para proteger o acesso ao evento. Deixe em branco para remover a senha.</p>

        <input
          type="text"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Senha do evento (opcional)"
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm"
        />

        <div className="flex gap-2 mt-4">
          <button onClick={() => { onSave(null); }} className="flex-1 px-4 py-3 rounded-lg border border-border text-foreground text-sm font-medium min-h-[44px]">
            Remover Senha
          </button>
          <button onClick={() => onSave(password || null)} disabled={isSaving} className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm min-h-[44px] disabled:opacity-50">
            {isSaving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
