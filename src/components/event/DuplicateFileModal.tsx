import { useState, useEffect } from "react";
import { X, AlertTriangle } from "lucide-react";

export type DuplicateDecision = "skip" | "replace";

export interface DuplicatePromptState {
  fileName: string;
  resolve: (result: { decision: DuplicateDecision; applyAll: boolean }) => void;
}

interface Props {
  state: DuplicatePromptState | null;
  onCancelAll: () => void;
}

/**
 * Modal "Arquivo duplicado" — pergunta ao usuário se quer pular ou substituir
 * o arquivo já existente no evento, com opção de aplicar a decisão a todo o lote.
 */
export default function DuplicateFileModal({ state, onCancelAll }: Props) {
  const [decision, setDecision] = useState<DuplicateDecision>("skip");
  const [applyAll, setApplyAll] = useState(false);

  // Reset escolhas a cada novo arquivo apresentado
  useEffect(() => {
    if (state) {
      setDecision("skip");
      setApplyAll(false);
    }
  }, [state?.fileName]);

  if (!state) return null;

  const confirm = () => {
    state.resolve({ decision, applyAll });
  };

  const cancel = () => {
    // Cancelar = não enviar este e abortar restante
    onCancelAll();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary-foreground" />
            <h3 className="text-primary-foreground font-bold text-lg">Arquivo duplicado</h3>
          </div>
          <button onClick={cancel} className="text-primary-foreground/90 hover:text-primary-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-foreground">
            A foto <span className="font-semibold text-primary break-all">{state.fileName}</span> já foi enviada anteriormente.
            <br />O que deseja fazer?
          </p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/40 transition-colors">
              <input
                type="radio"
                name="dup-decision"
                checked={decision === "skip"}
                onChange={() => setDecision("skip")}
                className="mt-0.5 accent-primary w-4 h-4"
              />
              <span className="text-sm text-foreground font-medium">Não enviar novamente</span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-secondary/40 transition-colors border-t border-border pt-3">
              <input
                type="radio"
                name="dup-decision"
                checked={decision === "replace"}
                onChange={() => setDecision("replace")}
                className="mt-0.5 accent-primary w-4 h-4"
              />
              <div className="flex-1">
                <span className="text-sm text-foreground font-medium block">Substituir a anterior</span>
                <span className="text-xs text-muted-foreground italic block mt-1">
                  Ao substituir o arquivo, será adicionado automaticamente um identificador
                  ao nome da foto para que a substituição funcione corretamente.
                </span>
              </div>
            </label>
          </div>

          <label className="flex items-center gap-2 p-3 rounded-lg border-l-4 border-primary bg-secondary/30 cursor-pointer">
            <input
              type="checkbox"
              checked={applyAll}
              onChange={e => setApplyAll(e.target.checked)}
              className="accent-primary w-4 h-4"
            />
            <span className="text-sm text-foreground">
              Aplicar esta mesma ação para todas as próximas fotos deste lote
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-secondary/20 flex items-center justify-end gap-2 border-t border-border">
          <button
            onClick={cancel}
            className="px-5 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-secondary/50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirm}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}