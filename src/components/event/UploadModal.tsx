import { useState, useRef, useCallback } from "react";
import { X, Upload, Image } from "lucide-react";
import { toast } from "sonner";

const PHOTO_MAX_BYTES = 30 * 1024 * 1024;
const VIDEO_MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
const VIDEO_MAX_DURATION_SEC = 90;

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
    if (f.size > PHOTO_MAX_BYTES) {
      tooLarge.push(f.name);
      continue;
    }
    valid.push(f);
  }
  return { valid, invalidFormat, tooLarge };
}

function isMp4OrMov(f: File): boolean {
  const name = f.name.toLowerCase();
  const t = (f.type || "").toLowerCase();
  return (
    name.endsWith(".mp4") ||
    name.endsWith(".mov") ||
    t === "video/mp4" ||
    t === "video/quicktime" ||
    t === "video/mov"
  );
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.src = "";
    };
    video.onloadedmetadata = () => {
      const d = Number(video.duration) || 0;
      cleanup();
      resolve(d);
    };
    video.onerror = () => { cleanup(); resolve(0); };
    video.src = url;
  });
}

async function filterVideos(input: File[]): Promise<{
  valid: File[]; invalidFormat: string[]; tooLarge: string[]; tooLong: string[];
}> {
  const valid: File[] = [];
  const invalidFormat: string[] = [];
  const tooLarge: string[] = [];
  const tooLong: string[] = [];
  for (const f of input) {
    if (!isMp4OrMov(f)) { invalidFormat.push(f.name); continue; }
    if (f.size > VIDEO_MAX_BYTES) { tooLarge.push(f.name); continue; }
    const dur = await readVideoDuration(f);
    if (dur > VIDEO_MAX_DURATION_SEC + 0.5) {
      tooLong.push(`${f.name} (${Math.round(dur)}s)`);
      continue;
    }
    valid.push(f);
  }
  return { valid, invalidFormat, tooLarge, tooLong };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
  isUploading: boolean;
  type: "photos" | "videos";
}

export default function UploadModal({ open, onClose, onUpload, isUploading, type }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const addVideos = useCallback(async (incoming: File[]) => {
    const { valid, invalidFormat, tooLarge, tooLong } = await filterVideos(incoming);
    if (invalidFormat.length > 0) {
      toast.error(`Formato não suportado. Envie apenas MP4 ou MOV: ${invalidFormat.join(", ")}`);
    }
    if (tooLarge.length > 0) {
      toast.error(`Arquivo acima de 5GB: ${tooLarge.join(", ")}`);
    }
    if (tooLong.length > 0) {
      toast.error(`Vídeo acima de 90s: ${tooLong.join(", ")}`);
    }
    if (valid.length > 0) setFiles(prev => [...prev, ...valid]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (type === "photos") addPhotos(dropped);
    else addVideos(dropped);
  }, [type, addPhotos, addVideos]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const list = Array.from(e.target.files);
    if (type === "photos") addPhotos(list);
    else addVideos(list);
    e.target.value = "";
  };

  const handleSubmit = () => {
    if (files.length === 0) return;
    onUpload(files);
    setFiles([]);
  };

  if (!open) return null;

  const accept = type === "photos"
    ? ".jpg,.jpeg,image/jpeg"
    : ".mp4,.mov,video/mp4,video/quicktime";
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
          <p className="text-xs text-muted-foreground">{type === "photos" ? "Apenas JPG ou JPEG • Máximo 30MB por arquivo" : "MP4 ou MOV • Máximo 5GB e até 90 segundos"}</p>
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
    </div>
  );
}
