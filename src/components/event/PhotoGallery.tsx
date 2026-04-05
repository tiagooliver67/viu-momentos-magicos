import { useState, useRef, useCallback, useEffect } from "react";
import { X, Trash2, Search, Upload, Image, MoreVertical, FolderPlus, ScanFace, Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getSignedReadUrls } from "@/hooks/useS3Upload";

interface Photo {
  id: string;
  file_url: string;
  file_name: string | null;
  identified: boolean;
  album: string | null;
  created_at: string;
}

interface UploadingFile {
  file: File;
  preview: string;
  progress: number;
  status: "uploading" | "done" | "error";
}

interface Props {
  open: boolean;
  onClose: () => void;
  photos: Photo[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
  totalPhotos: number;
  onUploadFiles?: (files: File[]) => void;
  isUploading?: boolean;
}

const PHOTOS_PER_PAGE = 20;

export default function PhotoGallery({ open, onClose, photos, onDelete, isDeleting, totalPhotos, onUploadFiles, isUploading }: Props) {
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve signed URLs for S3 paths
  useEffect(() => {
    if (!open || photos.length === 0) return;
    const s3Paths = photos
      .filter(p => p.file_url.startsWith("eventos/"))
      .map(p => p.file_url)
      .filter(p => !signedUrls[p]);
    if (s3Paths.length === 0) return;
    getSignedReadUrls(s3Paths).then(urls => {
      setSignedUrls(prev => ({ ...prev, ...urls }));
    }).catch(console.error);
  }, [open, photos]);

  const getPhotoUrl = (photo: Photo) => {
    if (photo.file_url.startsWith("eventos/")) {
      return signedUrls[photo.file_url] || "";
    }
    return photo.file_url; // legacy Supabase Storage URLs
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (dropped.length > 0) startUpload(dropped);
  }, [onUploadFiles]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      startUpload(files);
      e.target.value = "";
    }
  };

  const startUpload = (files: File[]) => {
    const newUploading: UploadingFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "uploading" as const,
    }));
    setUploadingFiles(prev => [...prev, ...newUploading]);

    // Simulate progress while actual upload runs
    const interval = setInterval(() => {
      setUploadingFiles(prev => prev.map(f =>
        f.status === "uploading" ? { ...f, progress: Math.min(f.progress + 15, 90) } : f
      ));
    }, 400);

    onUploadFiles?.(files);

    // Mark done after a delay (the real upload completes via mutation)
    setTimeout(() => {
      clearInterval(interval);
      setUploadingFiles(prev => prev.map(f => ({ ...f, progress: 100, status: "done" as const })));
      // Clean up after animation
      setTimeout(() => setUploadingFiles([]), 2000);
    }, files.length * 800 + 1000);
  };

  if (!open) return null;

  const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);
  const paginatedPhotos = photos.slice((page - 1) * PHOTOS_PER_PAGE, page * PHOTOS_PER_PAGE);

  // Stats
  const sold = 0;
  const revenue = 0;
  const avgTicket = 0;
  const earnings = 0;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-primary font-bold text-sm">GERENCIADOR DE FOTOS</p>
            <p className="text-xs text-muted-foreground">{totalPhotos} fotos no evento</p>
          </div>
          <button onClick={onClose} className="text-primary text-sm font-medium hover:underline">
            Voltar para dashboard do evento
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Mídias vendidas</p>
            <p className="text-xl font-bold text-foreground">{sold}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Faturamento</p>
            <p className="text-xl font-bold text-foreground">R$ {revenue.toFixed(2).replace(".", ",")}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
            <p className="text-xl font-bold text-foreground">R$ {avgTicket.toFixed(2).replace(".", ",")}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Seus ganhos</p>
            <p className="text-xl font-bold text-foreground">R$ {earnings.toFixed(2).replace(".", ",")}</p>
          </div>
        </div>

        {/* Breadcrumb + folder */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-foreground">Você está na pasta raiz</p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-foreground hover:bg-secondary/50 transition-colors">
              <FolderPlus className="w-4 h-4" />
              Adicionar pasta
            </button>
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
            <p className="text-sm font-bold text-foreground whitespace-nowrap">Fotos ({totalPhotos})</p>
            <div className="flex items-center gap-2 flex-1">
              <button className="p-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                <ScanFace className="w-4 h-4 text-muted-foreground" />
              </button>
              <select className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">
                <option>Todos os fotógrafos</option>
              </select>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="IDs separados por , ou ;"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
                />
              </div>
              <button className="p-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-10 sm:p-16 text-center hover:border-primary/50 transition-colors cursor-pointer mb-6"
          >
            <p className="text-sm text-foreground">
              Arraste aqui ou{" "}
              <span className="text-primary font-medium hover:underline">Selecione as fotos</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">Apenas JPEG</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleSelect}
              className="hidden"
            />
          </div>

          {/* Uploading progress */}
          {uploadingFiles.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-foreground mb-3">
                Enviando {uploadingFiles.filter(f => f.status === "uploading").length} de {uploadingFiles.length} fotos...
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {uploadingFiles.map((uf, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden aspect-square bg-secondary">
                    <img src={uf.preview} alt="" className="w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-x-0 bottom-0 p-1.5 bg-black/50">
                      <Progress value={uf.progress} className="h-1.5" />
                    </div>
                    {uf.status === "done" && (
                      <div className="absolute inset-0 bg-lime/20 flex items-center justify-center">
                        <span className="text-lime text-xl font-bold">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {paginatedPhotos.map((photo, idx) => (
              <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-secondary aspect-[4/5]">
                <img src={photo.file_url} alt={photo.file_name || ""} className="w-full h-full object-cover" loading="lazy" />
                
                {/* Top overlay - Capa badge + actions */}
                <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
                  <button className="flex items-center gap-1 px-2 py-1 rounded bg-primary/80 text-primary-foreground text-[10px] font-medium backdrop-blur-sm">
                    <Image className="w-3 h-3" />
                    Capa
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(photo.id); }} className="p-1 rounded bg-black/40 backdrop-blur-sm text-white hover:bg-destructive/80">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 rounded bg-black/40 backdrop-blur-sm text-white">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom overlay - file name + checkbox */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-white/50" />
                      <span className="text-[10px] text-white/80 truncate max-w-[120px]">
                        {photo.file_name ? `...${photo.file_name.slice(-20)}` : "foto"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover expand */}
                <div
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all cursor-pointer"
                  onClick={() => setLightbox(photo.file_url)}
                />
              </div>
            ))}
          </div>

          {photos.length === 0 && uploadingFiles.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Upload className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma foto enviada ainda. Arraste fotos acima para começar.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 mt-6">
              <span className="text-sm text-muted-foreground mr-2">
                Página <input type="number" value={page} onChange={e => setPage(Math.max(1, Math.min(totalPages, Number(e.target.value))))} className="w-10 text-center border border-border rounded px-1 py-0.5 text-sm bg-background text-foreground mx-1" /> de {totalPages}
              </span>
              <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded border border-border disabled:opacity-30 hover:bg-secondary/50"><ChevronsLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-border disabled:opacity-30 hover:bg-secondary/50"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-border disabled:opacity-30 hover:bg-secondary/50"><ChevronRight className="w-4 h-4" /></button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded border border-border disabled:opacity-30 hover:bg-secondary/50"><ChevronsRight className="w-4 h-4" /></button>
            </div>
          )}
        </div>
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
