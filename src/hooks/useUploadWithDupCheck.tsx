import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  detectDuplicates,
  enrichWithHashes,
  uniqueName,
  renameFile,
  type DuplicateEntry,
} from "@/lib/duplicateDetection";
import type { DuplicateResolution } from "@/components/event/DuplicateFilesModal";
import { useS3Upload } from "@/hooks/useS3Upload";

type UploadType = "fotos" | "videos";

interface Options {
  eventId: string;
  type: UploadType;
  watermarkUrl?: string;
  onProgress?: Parameters<typeof useS3Upload>[0]["onProgress"];
}

interface PendingDup {
  duplicates: DuplicateEntry[];
  fresh: File[];
  hashes: Map<File, string>;
  album: string | null;
}

interface HashingState {
  active: boolean;
  doneFiles: number;
  totalFiles: number;
  currentFraction: number;
  currentFileName: string;
}

/**
 * Uploader compartilhado com detecção de duplicatas por hash de conteúdo.
 *
 * Fluxo:
 * 1. `start(files, album?)` calcula SHA-256 (streaming, 8MB chunks) de cada arquivo,
 *    puxa os registros existentes do evento (com file_hash + file_size + file_name),
 *    e roda `detectDuplicates` priorizando hash sobre nome.
 * 2. Se não houver duplicatas, dispara o `useS3Upload` diretamente, já enviando
 *    o mapa de hashes para serem gravados na coluna `file_hash`.
 * 3. Se houver, expõe `dupModal` para o caller renderizar `<DuplicateFilesModal />`.
 * 4. `resolveDup(choice)` finaliza a decisão (ignorar / manter ambos / substituir / atualizar).
 */
export function useUploadWithDupCheck({ eventId, type, watermarkUrl, onProgress }: Options) {
  const queryClient = useQueryClient();
  const uploader = useS3Upload({ eventId, type, watermarkUrl, onProgress });
  const [pending, setPending] = useState<PendingDup | null>(null);
  const [hashing, setHashing] = useState<HashingState>({
    active: false,
    doneFiles: 0,
    totalFiles: 0,
    currentFraction: 0,
    currentFileName: "",
  });

  const tableName = type === "fotos" ? "event_photos" : "event_videos";
  const queryKey = type === "fotos" ? "event-photos" : "event-videos";

  const start = useCallback(
    async (files: File[], album?: string | null) => {
      if (!eventId || files.length === 0) return;
      // 1) Compute SHA-256 for every incoming file, streaming (chunks de 8MB).
      setHashing({ active: true, doneFiles: 0, totalFiles: files.length, currentFraction: 0, currentFileName: files[0]?.name || "" });
      const hashes = await enrichWithHashes(files, (info) => {
        setHashing({
          active: true,
          doneFiles: info.doneFiles,
          totalFiles: info.totalFiles,
          currentFraction: info.currentFileFraction,
          currentFileName: info.currentFileName,
        });
      });
      setHashing((s) => ({ ...s, active: false }));

      // 2) Load existing rows for this event (name + size + hash).
      let existing: any[] = [];
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select("id, file_name, file_size, file_hash")
          .eq("event_id", eventId);
        if (error) throw error;
        existing = data || [];
      } catch (err: any) {
        console.warn("[useUploadWithDupCheck] Falha ao buscar arquivos existentes; seguindo sem checagem:", err?.message || err);
        // Sem checagem, mas com hashes → segue upload direto.
        uploader.mutate({ files, album: album ?? null, fileHashes: hashes });
        return;
      }

      // 3) Detect duplicates (hash-first, fallback name+size).
      const { fresh, duplicates } = detectDuplicates(files, existing, hashes);

      if (duplicates.length === 0) {
        uploader.mutate({ files: fresh, album: album ?? null, fileHashes: hashes });
        return;
      }
      setPending({ duplicates, fresh, hashes, album: album ?? null });
    },
    [eventId, tableName, uploader],
  );

  const resolveDup = useCallback(
    async (choice: DuplicateResolution) => {
      if (!pending) return;
      const { duplicates, fresh, hashes, album } = pending;

      // Names taken (existing + current batch) — para keep-both.
      const existingNames = new Set<string>();
      for (const d of duplicates) {
        if (d.existing.file_name) existingNames.add(d.existing.file_name.toLowerCase());
      }
      for (const f of fresh) existingNames.add(f.name.toLowerCase());

      let toUpload: File[] = [...fresh];

      if (choice === "ignore") {
        // fresh only
      } else if (choice === "keep-both") {
        for (const d of duplicates) {
          const newName = uniqueName(d.file.name, existingNames);
          existingNames.add(newName.toLowerCase());
          const renamed = renameFile(d.file, newName);
          // "Manter todos" é a decisão explícita do usuário de guardar duas
          // cópias do mesmo conteúdo. Se copiássemos o hash, o índice único
          // parcial (event_id, file_hash) rejeitaria o insert com 23505.
          // Para arquivos idênticos, deixamos file_hash=NULL nesse novo
          // registro (o índice parcial ignora NULLs). Para "mesmo nome,
          // conteúdo diferente", os hashes já são diferentes, então
          // preservamos normalmente.
          if (!d.identical) {
            const h = hashes.get(d.file);
            if (h) hashes.set(renamed, h);
          }
          toUpload.push(renamed);
        }
      } else if (choice === "replace") {
        try {
          const idsToRemove = duplicates.map((d) => d.existing.id);
          const { error } = await supabase.from(tableName).delete().in("id", idsToRemove);
          if (error) throw error;
          toUpload.push(...duplicates.map((d) => d.file));
        } catch (err: any) {
          toast.error("Falha ao substituir arquivos: " + (err.message || err));
          setPending(null);
          return;
        }
      } else if (choice === "update") {
        const toDelete: string[] = [];
        for (const d of duplicates) {
          if (d.identical) continue;
          toDelete.push(d.existing.id);
          toUpload.push(d.file);
        }
        if (toDelete.length > 0) {
          try {
            const { error } = await supabase.from(tableName).delete().in("id", toDelete);
            if (error) throw error;
          } catch (err: any) {
            toast.error("Falha ao atualizar arquivos: " + (err.message || err));
            setPending(null);
            return;
          }
        }
      }

      setPending(null);

      if (toUpload.length === 0) {
        toast.info("Nenhum arquivo novo para enviar.");
        queryClient.invalidateQueries({ queryKey: [queryKey, eventId] });
        return;
      }

      uploader.mutate({ files: toUpload, album: album ?? null, fileHashes: hashes });
    },
    [pending, tableName, queryKey, eventId, uploader, queryClient],
  );

  const cancelDup = useCallback(() => setPending(null), []);

  return {
    /** Kickoff — computes hashes, checks duplicates, then either uploads or opens modal. */
    start,
    /** Underlying mutation (for `.isPending`, etc.). */
    uploader,
    /** Progress info while SHA-256 is being computed on the client. */
    hashing,
    /** Props to spread into <DuplicateFilesModal />. */
    dupModal: {
      open: !!pending,
      duplicates: pending?.duplicates ?? [],
      freshCount: pending?.fresh.length ?? 0,
      type: (type === "fotos" ? "photos" : "videos") as "photos" | "videos",
      onClose: cancelDup,
      onConfirm: resolveDup,
    },
  };
}