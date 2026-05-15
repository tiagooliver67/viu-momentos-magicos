import { useState, useRef, useCallback } from "react";
import { X, Upload, Image } from "lucide-react";
import { toast } from "sonner";
import { useDuplicateFileCheck } from "@/hooks/useDuplicateFileCheck";
import DuplicateFileModal from "./DuplicateFileModal";

const MAX_SIZE_BYTES = 30 * 1024 * 1024;

function filterPhotos(input: File[]): { valid: File[]; invalidFormat: string[]; tooLarge: string[] } {
  const valid: File[] = [];
  const invalidFormat: string[] = [];
  const tooLarge: string[] = [];
  for (const f of input) {
    const name = f.name.toLowerCase();
    const isJpeg = f.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
    if (!isJpeg) {
      invalidFormat.push(f.name);
      continue;
    }
    if (f.size > MAX_SIZE_BYTES) {
      tooLarge.push(f.name);
      continue;
    }
    valid.push(f);
  }
  return { valid, invalidFormat, tooLarge };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
  isUploading: boolean;
  type: "photos" | "videos";
  eventId?: string;
}

export default function UploadModal({ open, onClose, onUpload, isUploading, type, eventId }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dupCheck = useDuplicateFileCheck(eventId, type === "photos" ? "event_photos" : "event_videos");

  const addPhotos = useCallback((incoming: File[]) => {
    const { valid, invalidFormat, tooLarge } = filterPhotos(incoming);
    if (invalidFormat.length > 0) {
      toast.error("Formato não suportado. Por favor, envie apenas fotos em JPG ou JPEG.");
    }
    if (tooLarge.length > 0) {
      toast.error(`Arquivo acima de 30MB: ${tooLarge.join(", ")}`);
    }
    if (valid.length > 0) setFiles(prev => [...prev, ...valid]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (type === "photos") addPhotos(dropped);
    else setFiles(prev => [...prev, ...dropped]);
  }, [type, addPhotos]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const list = Array.from(e.target.files);
    if (type === "photos") addPhotos(list);
    else setFiles(prev => [...prev, ...list]);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (files.length === 0) return;
    const finalFiles = type === "photos" ? await dupCheck.check(files) : files;
    if (finalFiles.length === 0) {
      toast.info("Nenhum arquivo novo para enviar.");
      setFiles([]);
      return;
    }
    onUpload(finalFiles);
    setFiles([]);
  };

  if (!open) return null;

  const accept = type === "photos" ? ".jpg,.jpeg,image/jpeg" : "video/mp4,video/mov,video/avi";
  const label = type === "photos" ? "Fotos" : "Vídeos";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-foreground text-lg">Upload de {label}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/50 transition-colors cursor-pointer"
        >
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium mb-1">Solte arquivos aqui, cole ou <span className="text-primary">procure arquivos</span></p>
          <p className="text-xs text-muted-foreground">{type === "photos" ? "Apenas JPG ou JPEG • Máximo 30MB por arquivo" : "MP4, MOV, AVI • Máximo 100MB por arquivo"}</p>
          <input ref={inputRef} type="file" multiple accept={accept} onChange={handleSelect} className="hidden" />
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-foreground truncate max-w-[200px]">{f.name}</span>
                </div>
                <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{files.length} arquivo(s) selecionado(s)</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-border text-foreground text-sm font-medium min-h-[44px]">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={files.length === 0 || isUploading}
            className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm min-h-[44px] disabled:opacity-50"
          >
            {isUploading ? "Enviando..." : `Enviar ${files.length} arquivo(s)`}
          </button>
        </div>
      </div>
      <DuplicateFileModal state={dupCheck.prompt} onCancelAll={dupCheck.cancelAll} />
    </div>
  );
}
