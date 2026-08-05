import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

/**
 * Hook para gerenciar o monitoramento de pastas locais via File System Access API.
 * Suporta detecção de novos arquivos e integração com o pipeline de upload existente.
 */
export function useFolderMonitor(options: {
  onFilesDetected: (files: File[]) => Promise<void>;
  type: "photos" | "videos";
  enabled: boolean;
}) {
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [processedHashes] = useState<Set<string>>(new Set());
  const [errorLog, setErrorLog] = useState<{ name: string; reason: string; timestamp: number }[]>([]);

  const logError = (name: string, reason: string) => {
    setErrorLog(prev => [{ name, reason, timestamp: Date.now() }, ...prev].slice(0, 50));
  };

  const checkNewFiles = useCallback(async (handle: FileSystemDirectoryHandle) => {
    try {
      const newFiles: File[] = [];
      // @ts-ignore - FileSystemDirectoryHandle values() is an async iterator but TS might not recognize it correctly
      for await (const entry of handle.values()) {
        if (entry.kind === "file") {
          const file = await (entry as FileSystemFileHandle).getFile();
          // Criar uma chave única baseada em nome, tamanho e última modificação para evitar re-upload imediato
          // O hash SHA-256 real será feito no pipeline de upload (useUploadWithDupCheck)
          const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
          
          if (!processedHashes.has(fileKey)) {
            newFiles.push(file);
            processedHashes.add(fileKey);
          }
        }
      }

      if (newFiles.length > 0) {
        await options.onFilesDetected(newFiles);
      }
    } catch (err: any) {
      console.error("[useFolderMonitor] Erro ao verificar arquivos:", err);
      logError("Monitoramento", err.message || "Erro desconhecido");
    }
  }, [options, processedHashes]);

  const startMonitoring = async () => {
    try {
      if (!("showDirectoryPicker" in window)) {
        toast.error("Seu navegador não suporta acesso a pastas locais. Use Chrome, Edge ou Opera.");
        return;
      }

      const handle = await window.showDirectoryPicker({
        mode: "read",
      });
      
      setDirectoryHandle(handle);
      setIsMonitoring(true);
      processedHashes.clear();
      setErrorLog([]);
      
      toast.success("Monitoramento de pasta iniciado!");
      
      // Primeira verificação imediata para ignorar o que já está lá ou subir se o usuário preferir
      // (O requisito diz "conforme novos arquivos são exportados", então idealmente monitoramos mudanças)
      // Mas para uma experiência fluida, processamos o estado atual como "inicial".
      await checkNewFiles(handle);

    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast.error("Erro ao selecionar pasta: " + err.message);
      }
    }
  };

  const stopMonitoring = () => {
    setDirectoryHandle(null);
    setIsMonitoring(false);
    toast.info("Monitoramento de pasta interrompido.");
  };

  // Efeito de Polling (fallback robusto para navegadores que não suportam Observer ou quando a aba está em background)
  useEffect(() => {
    if (!isMonitoring || !directoryHandle) return;

    const interval = setInterval(() => {
      // O navegador pode restringir o acesso se a página estiver em background,
      // mas a API permite continuar se o usuário deu permissão persistente na sessão.
      checkNewFiles(directoryHandle);
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(interval);
  }, [isMonitoring, directoryHandle, checkNewFiles]);

  return {
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    directoryName: directoryHandle?.name,
    errorLog,
    isSupported: typeof window !== "undefined" && "showDirectoryPicker" in window,
  };
}
