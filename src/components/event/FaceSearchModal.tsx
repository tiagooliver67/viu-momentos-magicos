import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, ScanFace, Loader2, Camera, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Match {
  photo_id: string;
  similarity: number;
  rank: number;
  source: "face" | "bib";
}

interface Props {
  eventId: string;
  open: boolean;
  onClose: () => void;
  onResults: (photoIds: string[], matches: Match[]) => void;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File, maxDim = 1024, quality = 0.85): Promise<string> {
  const dataUrl = await fileToBase64(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas indisponível"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const FaceSearchModal = ({ eventId, open, onClose, onResults }: Props) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (JPG/PNG).");
      return;
    }
    setMatches(null);
    setLoading(true);
    try {
      const compressed = await compressImage(file);
      setPreview(compressed);
      const { data, error } = await supabase.functions.invoke("hybrid-search", {
        body: { event_id: eventId, selfie_base64: compressed },
      });
      if (error) throw error;
      const m: Match[] = data?.matches || [];
      setMatches(m);
      onResults(m.map((x) => x.photo_id), m);
      if (m.length === 0) {
        toast.info("Nenhuma foto encontrada. Tente outra selfie ou verifique se o evento já foi indexado.");
      } else {
        toast.success(`${m.length} foto(s) encontrada(s)!`);
      }
    } catch (e: any) {
      const msg = e?.message || "Falha na busca facial";
      toast.error(msg.includes("rosto") ? msg : "Falha na busca. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const onPick = () => inputRef.current?.click();

  const reset = () => {
    setPreview(null);
    setMatches(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="glass-card w-full sm:max-w-md max-h-[90dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-muted/40 hover:bg-muted flex items-center justify-center"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <ScanFace className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Encontre suas fotos</h2>
            <p className="text-xs text-muted-foreground">Tire ou envie uma selfie</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-3 mb-4">
          Sua selfie é usada apenas para esta busca e não é armazenada.
        </p>

        {preview ? (
          <div className="relative w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden border border-border">
            <img src={preview} alt="Selfie" className="w-full h-full object-cover" />
          </div>
        ) : (
          <button
            onClick={onPick}
            className="w-full border-2 border-dashed border-border rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-accent hover:bg-accent/5 transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Camera className="w-6 h-6 text-accent" />
            </div>
            <span className="font-semibold text-foreground">Tirar ou enviar selfie</span>
            <span className="text-xs text-muted-foreground">JPG/PNG até 5MB</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {loading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analisando rosto e buscando fotos…
          </div>
        )}

        {!loading && matches && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-semibold text-foreground">
                {matches.length} resultado(s)
              </span>
              {matches.length > 0 && (
                <span className="text-muted-foreground">
                  · melhor match {Math.round(matches[0].similarity)}%
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold text-sm min-h-[44px]"
              >
                Ver fotos
              </button>
              <button
                onClick={reset}
                className="px-4 py-2.5 rounded-lg border border-border text-sm font-semibold min-h-[44px]"
              >
                Nova selfie
              </button>
            </div>
          </div>
        )}

        {!loading && !matches && preview && (
          <button
            onClick={reset}
            className="mt-3 w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Escolher outra foto
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default FaceSearchModal;
