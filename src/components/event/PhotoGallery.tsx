import { useState } from "react";
import { X, Trash2, Search, Download } from "lucide-react";

interface Photo {
  id: string;
  file_url: string;
  file_name: string | null;
  identified: boolean;
  album: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  photos: Photo[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
  totalPhotos: number;
}

export default function PhotoGallery({ open, onClose, photos, onDelete, isDeleting, totalPhotos }: Props) {
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (!open) return null;

  const identified = photos.filter(p => p.identified).length;
  const unidentified = photos.filter(p => !p.identified).length;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-primary font-bold text-sm">GERENCIADOR DE FOTOS</p>
            <p className="text-xs text-muted-foreground">{totalPhotos} fotos</p>
          </div>
          <button onClick={onClose} className="text-primary text-sm font-medium">Voltar para dashboard do evento</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-primary/10 rounded-xl p-3">
            <p className="text-xl font-bold text-foreground">{totalPhotos}</p>
            <p className="text-xs text-primary font-medium">Total de fotos</p>
          </div>
          <div className="bg-lime/10 rounded-xl p-3">
            <p className="text-xl font-bold text-foreground">{identified}</p>
            <p className="text-xs text-lime font-medium">Identificadas</p>
          </div>
          <div className="bg-yellow-500/10 rounded-xl p-3">
            <p className="text-xl font-bold text-foreground">{unidentified}</p>
            <p className="text-xs text-yellow-500 font-medium">Não identificadas</p>
          </div>
          <div className="bg-accent/10 rounded-xl p-3">
            <p className="text-xl font-bold text-foreground">0</p>
            <p className="text-xs text-accent font-medium">Corretor automático</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 relative">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Digite número ou ID..." className="w-full px-3 py-2 pl-9 rounded-lg bg-secondary border border-border text-foreground text-sm" />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3">{photos.length} fotos encontradas</p>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-secondary aspect-square">
              <img src={photo.file_url} alt={photo.file_name || ""} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <button onClick={() => setLightbox(photo.file_url)} className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                    <Search className="w-4 h-4 text-white" />
                  </button>
                  <button onClick={() => onDelete(photo.id)} className="p-2 rounded-full bg-red-500/80 backdrop-blur-sm">
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Nenhuma foto enviada ainda</p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
          <img src={lightbox} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" />
        </div>
      )}
    </div>
  );
}
