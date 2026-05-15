import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, Trash2, Search, Upload, Image, MoreVertical, FolderPlus, ScanFace, Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle2, AlertCircle, Loader2, RotateCcw, Star, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getSignedReadUrls, getSignedReadUrl } from "@/hooks/useS3Upload";
import { toast } from "sonner";
import {
  getThumbCdnUrl,
  toThumbPath as cdnToThumbPath,
  IS_LAMBDA_PIPELINE_ACTIVE,
} from "@/lib/cdnConfig";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDuplicateFileCheck } from "@/hooks/useDuplicateFileCheck";
import DuplicateFileModal from "./DuplicateFileModal";

/**
 * Defensive image renderer — if the CDN thumb (.webp) returns 403/404 because the
 * AWS Lambda pipeline failed to generate the variant (known issue with horizontal
 * landscape originals), it falls back to a signed URL of the original file so the
 * photographer still sees the photo. Displays an orange warning icon to flag the
 * incident for monitoring.
 */
function PhotoThumb({
  src,
  filePath,
  alt,
  isStoragePath,
}: {
  src: string;
  filePath: string;
  alt: string;
  isStoragePath: boolean;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [usingFallback, setUsingFallback] = useState(false);
  const [fallbackTried, setFallbackTried] = useState(false);
  const [hardError, setHardError] = useState(false);

  // Reset when the upstream src changes (e.g. signed URL resolved later)
  useEffect(() => {
    setCurrentSrc(src);
    setUsingFallback(false);
    setFallbackTried(false);
    setHardError(false);
  }, [src]);

  const handleError = async () => {
    if (fallbackTried || !isStoragePath) {
      setHardError(true);
      return;
    }
    setFallbackTried(true);
    try {
      const signed = await getSignedReadUrl(filePath);
      if (signed) {
        setCurrentSrc(signed);
        setUsingFallback(true);
        return;
      }
    } catch (e) {
      console.warn("[PhotoThumb] fallback signed URL failed for", filePath, e);
    }
    setHardError(true);
  };

  if (hardError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground bg-secondary">
        <AlertCircle className="w-6 h-6 text-destructive/70" />
        <span className="text-[10px] text-center px-2">Falha ao carregar</span>
      </div>
    );
  }

  return (
    <>
      <img
        src={currentSrc}
        alt={alt}
        loading="lazy"
        onError={handleError}
        className="w-full h-full object-cover"
      />
      {usingFallback && (
        <div
          title="Pré-visualização não foi gerada pelo pipeline. Exibindo o original. Verifique o monitoramento."
          className="absolute top-2 left-2 z-30 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/95 text-white text-[10px] font-semibold shadow-md backdrop-blur-sm"
        >
          <AlertTriangle className="w-3 h-3" />
          Sem preview
        </div>
      )}
    </>
  );
}

interface Photo {
  id: string;
  file_url: string;
  file_name: string | null;
  identified: boolean;
  album: string | null;
  created_at: string;
}

export interface UploadFileProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  preview?: string;
  errorDetail?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  eventId?: string;
  photos: Photo[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
  totalPhotos: number;
  onUploadFiles?: (files: File[]) => void;
  onRetryFiles?: (files: File[]) => void;
  isUploading?: boolean;
  uploadProgress?: UploadFileProgress[];
  coverUrl?: string | null;
  onSetCover?: (photo: Photo) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const PHOTOS_PER_PAGE = 20;

export default function PhotoGallery({ open, onClose, eventId, photos, onDelete, isDeleting, totalPhotos, onUploadFiles, onRetryFiles, isUploading, uploadProgress = [], coverUrl, onSetCover, onBulkDelete }: Props) {
  const dupCheck = useDuplicateFileCheck(eventId, "event_photos");
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [failedFiles, setFailedFiles] = useState<File[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; bulk: boolean } | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<File[]>([]);

  // Track upload completion for toast
  useEffect(() => {
    if (uploadProgress.length === 0) return;
    const allFinished = uploadProgress.every(f => f.status === "done" || f.status === "error");
    if (allFinished) {
      const done = uploadProgress.filter(f => f.status === "done").length;
      const errors = uploadProgress.filter(f => f.status === "error").length;
      if (done > 0 && errors === 0) {
        toast.success(`${done} foto(s) enviada(s) com sucesso!`);
      } else if (done > 0 && errors > 0) {
        toast.warning(`${done} de ${uploadProgress.length} enviada(s). ${errors} falharam.`);
      } else if (errors > 0 && done === 0) {
        toast.error(`Falha ao enviar ${errors} foto(s). Verifique o console para detalhes.`);
      }
      // Track failed files for retry
      const failed = filesRef.current.filter((_, i) => uploadProgress[i]?.status === "error");
      setFailedFiles(failed);
    }
  }, [uploadProgress]);

  // Resolve signed URLs for S3 paths
  useEffect(() => {
    if (!open || photos.length === 0) return;
    const storagePhotos = photos.filter(
      p => p.file_url.startsWith("eventos/") || p.file_url.startsWith("usuarios/")
    );
    if (storagePhotos.length === 0) return;

    // CDN active: use public thumb URLs directly
    if (IS_LAMBDA_PIPELINE_ACTIVE) {
      const map: Record<string, string> = {};
      for (const p of storagePhotos) {
        if (signedUrls[p.file_url]) continue;
        const u = getThumbCdnUrl(p.file_url);
        if (u) map[p.file_url] = u;
      }
      if (Object.keys(map).length > 0) {
        setSignedUrls(prev => ({ ...prev, ...map }));
      }
      return;
    }

    // Fallback: signed URLs for the watermarked thumb variant
    const pending = storagePhotos
      .map(p => ({ original: p.file_url, thumb: cdnToThumbPath(p.file_url) }))
      .filter(x => !signedUrls[x.original]);
    if (pending.length === 0) return;
    getSignedReadUrls(pending.map(x => x.thumb)).then(urls => {
      const indexed: Record<string, string> = {};
      for (const x of pending) {
        if (urls[x.thumb]) indexed[x.original] = urls[x.thumb];
      }
      setSignedUrls(prev => ({ ...prev, ...indexed }));
    }).catch(console.error);
  }, [open, photos]);

  const getPhotoUrl = (photo: Photo) => {
    if (
      photo.file_url.startsWith("eventos/") ||
      photo.file_url.startsWith("usuarios/")
    ) {
      return signedUrls[photo.file_url] || "";
    }
    return photo.file_url;
  };

  const filterJpeg = (files: File[]): File[] => {
    const MAX = 30 * 1024 * 1024;
    const valid: File[] = [];
    const invalidFmt: string[] = [];
    const tooLarge: string[] = [];
    for (const f of files) {
      const name = f.name.toLowerCase();
      const isJpeg = f.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
      if (!isJpeg) { invalidFmt.push(f.name); continue; }
      if (f.size > MAX) { tooLarge.push(f.name); continue; }
      valid.push(f);
    }
    if (invalidFmt.length) toast.error("Formato não suportado. Por favor, envie apenas fotos em JPG ou JPEG.");
    if (tooLarge.length) toast.error(`Arquivo acima de 30MB: ${tooLarge.join(", ")}`);
    return valid;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    const dropped = filterJpeg(Array.from(e.dataTransfer.files));
    if (dropped.length > 0) startUpload(dropped);
  }, [onUploadFiles, isUploading]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;
    if (e.target.files) {
      const files = filterJpeg(Array.from(e.target.files));
      if (files.length > 0) startUpload(files);
      e.target.value = "";
    }
  };

  const startUpload = async (files: File[]) => {
    const finalFiles = await dupCheck.check(files);
    if (finalFiles.length === 0) {
      toast.info("Nenhuma foto nova para enviar.");
      return;
    }
    const newPreviews: Record<string, string> = {};
    finalFiles.forEach(f => {
      newPreviews[f.name] = URL.createObjectURL(f);
    });
    setPreviews(prev => ({ ...prev, ...newPreviews }));
    filesRef.current = finalFiles;
    setFailedFiles([]);
    onUploadFiles?.(finalFiles);
  };

  const handleRetry = () => {
    if (failedFiles.length === 0) return;
    const retryPreviews: Record<string, string> = {};
    failedFiles.forEach(f => {
      if (!previews[f.name]) {
        retryPreviews[f.name] = URL.createObjectURL(f);
      }
    });
    setPreviews(prev => ({ ...prev, ...retryPreviews }));
    filesRef.current = failedFiles;
    setFailedFiles([]);
    onUploadFiles?.(failedFiles);
  };

  if (!open) return null;

  const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);
  const paginatedPhotos = photos.slice((page - 1) * PHOTOS_PER_PAGE, page * PHOTOS_PER_PAGE);

  const isCoverPhoto = (photo: Photo) => {
    if (!coverUrl) return false;
    const last = (s: string) => s.split("/").pop() || s;
    return coverUrl === photo.file_url || last(coverUrl) === last(photo.file_url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.bulk && onBulkDelete) {
      onBulkDelete(confirmDelete.ids);
      clearSelection();
    } else {
      confirmDelete.ids.forEach(id => onDelete(id));
    }
    setConfirmDelete(null);
  };

  const sold = 0;
  const revenue = 0;
  const avgTicket = 0;
  const earnings = 0;

  const activeUploads = uploadProgress.filter(f => f.status === "uploading" || f.status === "pending");
  const doneCount = uploadProgress.filter(f => f.status === "done").length;
  const errorCount = uploadProgress.filter(f => f.status === "error").length;
  const hasActiveUpload = activeUploads.length > 0;
  const overallProgress = uploadProgress.length > 0
    ? Math.round(uploadProgress.reduce((sum, f) => sum + f.progress, 0) / uploadProgress.length)
    : 0;

  // Summary text
  const getUploadSummary = () => {
    if (hasActiveUpload) {
      return `Enviando ${activeUploads.length} de ${uploadProgress.length} fotos... ${overallProgress}%`;
    }
    if (uploadProgress.length === 0) return "";
    if (errorCount === 0) return `✅ ${doneCount} foto(s) enviada(s) com sucesso`;
    if (doneCount === 0) return `❌ ${errorCount} foto(s) falharam no envio`;
    return `${doneCount} enviada(s) com sucesso, ${errorCount} falharam`;
  };

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
            onClick={() => !isUploading && inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 sm:p-16 text-center transition-colors mb-6 ${
              isUploading 
                ? "border-primary/30 bg-primary/5 cursor-not-allowed" 
                : "border-border hover:border-primary/50 cursor-pointer"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm text-foreground font-medium">
                  Enviando {uploadProgress.length} foto(s)... {overallProgress}%
                </p>
                <Progress value={overallProgress} className="h-2 mt-3 max-w-xs mx-auto" />
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-foreground">
                  Arraste ou selecione suas fotos para começar o envio
                </p>
                <p className="text-xs text-muted-foreground mt-2">JPG ou JPEG • Máximo 30MB por arquivo</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,image/jpeg"
              onChange={handleSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {/* Per-file upload progress */}
          {uploadProgress.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-foreground">
                  {getUploadSummary()}
                </p>
                {!hasActiveUpload && failedFiles.length > 0 && (
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reenviar {failedFiles.length} foto(s)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {uploadProgress.map((uf, i) => (
                  <div key={i} className="relative rounded-lg overflow-hidden aspect-square bg-secondary">
                    {previews[uf.fileName] && (
                      <img src={previews[uf.fileName]} alt="" className="w-full h-full object-cover" />
                    )}
                    {/* Uploading/pending overlay */}
                    {(uf.status === "uploading" || uf.status === "pending") && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin mb-1" />
                        <span className="text-[10px] text-white font-medium">Enviando... {uf.progress}%</span>
                        <div className="absolute inset-x-0 bottom-0 p-1.5">
                          <Progress value={uf.progress} className="h-1.5" />
                        </div>
                      </div>
                    )}
                    {/* Done overlay */}
                    {uf.status === "done" && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-green-500 drop-shadow-md" />
                      </div>
                    )}
                    {/* Error overlay */}
                    {uf.status === "error" && (
                      <div className="absolute inset-0 bg-destructive/30 flex flex-col items-center justify-center gap-1">
                        <AlertCircle className="w-6 h-6 text-destructive drop-shadow-md" />
                        <span className="text-[9px] text-white font-medium bg-destructive/80 px-1.5 py-0.5 rounded">
                          Falhou
                        </span>
                      </div>
                    )}
                    {/* File name */}
                    <div className="absolute top-1 left-1 right-1">
                      <span className="text-[9px] text-white bg-black/40 px-1 rounded truncate block">
                        {uf.fileName.length > 15 ? `...${uf.fileName.slice(-15)}` : uf.fileName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground shadow-lg">
              <span className="text-sm font-medium">
                {selectedIds.size} foto(s) selecionada(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary-foreground/10 transition-colors"
                >
                  Limpar
                </button>
                <button
                  onClick={() => setConfirmDelete({ ids: Array.from(selectedIds), bulk: true })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors min-h-[36px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir selecionadas
                </button>
              </div>
            </div>
          )}

          {/* Photo Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {paginatedPhotos.map((photo) => {
              const url = getPhotoUrl(photo);
              if (!url) return (
                <div key={photo.id} className="relative rounded-lg overflow-hidden bg-secondary aspect-[4/5] flex items-center justify-center">
                  <div className="animate-pulse text-xs text-muted-foreground">Carregando...</div>
                </div>
              );
              const isCover = isCoverPhoto(photo);
              const isSelected = selectedIds.has(photo.id);
              return (
              <div key={photo.id} className={`relative group rounded-lg overflow-hidden bg-secondary aspect-[4/5] ${isSelected ? "ring-2 ring-primary" : ""}`}>
                <PhotoThumb
                  src={url}
                  filePath={photo.file_url}
                  alt={photo.file_name || ""}
                  isStoragePath={
                    photo.file_url.startsWith("eventos/") ||
                    photo.file_url.startsWith("usuarios/")
                  }
                />

                <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 z-20">
                  {isCover ? (
                    <span className="flex items-center gap-1 px-2 py-1 rounded bg-primary/90 text-primary-foreground text-[10px] font-semibold backdrop-blur-sm">
                      <Star className="w-3 h-3 fill-current" />
                      Capa do evento
                    </span>
                  ) : <span />}
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!isCover && onSetCover && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSetCover(photo); setMenuOpenId(null); }}
                        title="Definir como capa do evento"
                        className="p-1.5 rounded bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80 min-w-[32px] min-h-[32px] flex items-center justify-center"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete({ ids: [photo.id], bulk: false }); }}
                      title="Excluir foto"
                      className="p-1.5 rounded bg-black/50 backdrop-blur-sm text-white hover:bg-destructive/80 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 z-20">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(photo.id)}
                        className="w-4 h-4 rounded border-white/50 cursor-pointer accent-primary"
                      />
                      <span className="text-[10px] text-white/80 truncate max-w-[120px]">
                        {photo.file_name ? `...${photo.file_name.slice(-20)}` : "foto"}
                      </span>
                    </label>
                  </div>
                </div>

                <div
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all cursor-pointer z-10"
                  onClick={() => setLightbox(url)}
                />
              </div>
              );
            })}
          </div>

          {photos.length === 0 && uploadProgress.length === 0 && (
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

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.bulk
                ? `Excluir ${confirmDelete.ids.length} foto(s)?`
                : "Excluir esta foto?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. As fotos serão removidas permanentemente do evento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DuplicateFileModal state={dupCheck.prompt} onCancelAll={dupCheck.cancelAll} />
    </div>
  );
}
