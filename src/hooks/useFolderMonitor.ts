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
      // Use any to bypass TS error on async iterator if needed
      const values = (handle as any).values();
      for await (const entry of values) {
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
      // Proteção defensiva contra execução dentro de iframes (como o preview da Lovable)
      // O navegador bloqueia showDirectoryPicker em sub-frames de origens diferentes.
      const isIframe = window.top !== window.self;
      
      if (isIframe) {
        toast.error("Não é possível monitorar uma pasta dentro do modo de pré-visualização. Abra o site publicado (fora do editor) para usar essa função.", {
          duration: 6000
        });
        return;
      }

      if (!(window as any).showDirectoryPicker) {
        toast.error("Seu navegador não suporta acesso a pastas locais. Use Chrome, Edge ou Opera.");
        return;
      }

      const handle = await (window as any).showDirectoryPicker({
        mode: "read",
      });
      
      setDirectoryHandle(handle);
      setIsMonitoring(true);
      processedHashes.clear();
      setErrorLog([]);
      
      toast.success("Monitoramento de pasta iniciado!");
      await checkNewFiles(handle);

    } catch (err: any) {
      if (err.name === "SecurityError" || err.message?.includes("Cross origin sub frames")) {
        toast.error("Acesso bloqueado pelo navegador: Não é possível monitorar pastas dentro de pré-visualizações. Por favor, use o site publicado.");
      } else if (err.name !== "AbortError") {
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
