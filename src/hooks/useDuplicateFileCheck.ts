import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeFileName, withReplaceSuffix } from "@/lib/fileNameUtils";
import type { DuplicatePromptState, DuplicateDecision } from "@/components/event/DuplicateFileModal";

type TableName = "event_photos" | "event_videos";

/**
 * Verifica nomes duplicados antes do upload. Para cada arquivo já existente
 * no evento (comparação por nome normalizado), abre um prompt para o usuário
 * decidir entre Pular ou Substituir, com opção de aplicar a decisão a todo o lote.
 *
 * Em "Substituir", retorna o File renomeado com um sufixo único, mantendo o
 * arquivo anterior intacto (igual ao padrão de mercado mostrado no print).
 */
export function useDuplicateFileCheck(eventId: string | undefined, table: TableName = "event_photos") {
  const [prompt, setPrompt] = useState<DuplicatePromptState | null>(null);
  const cancelledRef = useRef(false);

  const cancelAll = useCallback(() => {
    cancelledRef.current = true;
    if (prompt) {
      prompt.resolve({ decision: "skip", applyAll: true });
    }
    setPrompt(null);
  }, [prompt]);

  const check = useCallback(
    async (files: File[]): Promise<File[]> => {
      cancelledRef.current = false;
      if (!eventId || files.length === 0) return files;

      // Carrega os nomes já existentes deste evento
      const { data, error } = await supabase
        .from(table)
        .select("file_name")
        .eq("event_id", eventId);

      if (error) {
        console.warn("[useDuplicateFileCheck] falha ao consultar duplicados:", error);
        return files;
      }

      const existing = new Set<string>();
      for (const r of data ?? []) {
        if (r.file_name) existing.add(normalizeFileName(r.file_name));
      }

      if (existing.size === 0) return files;

      const result: File[] = [];
      let bulk: DuplicateDecision | null = null;

      for (const f of files) {
        if (cancelledRef.current) break;
        const norm = normalizeFileName(f.name);
        if (!existing.has(norm)) {
          result.push(f);
          continue;
        }

        let decision: DuplicateDecision;
        if (bulk) {
          decision = bulk;
        } else {
          const res = await new Promise<{ decision: DuplicateDecision; applyAll: boolean }>(
            resolve => {
              setPrompt({ fileName: f.name, resolve });
            }
          );
          setPrompt(null);
          if (cancelledRef.current) break;
          decision = res.decision;
          if (res.applyAll) bulk = decision;
        }

        if (decision === "skip") continue;
        const newName = withReplaceSuffix(f.name);
        result.push(new File([f], newName, { type: f.type, lastModified: f.lastModified }));
        // Garante que o próximo arquivo com mesmo nome também seja reconhecido como duplicado
        existing.add(norm);
      }

      return result;
    },
    [eventId, table]
  );

  return { check, prompt, cancelAll };
}