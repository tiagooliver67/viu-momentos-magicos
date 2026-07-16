import { useState, useEffect, useRef } from "react";
import {
  X, Trash2, Upload, Loader2, AlertCircle, CheckCircle2, Clock, Play,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Download, Film, Info,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getSignedReadUrls } from "@/hooks/useS3Upload";
import { toast } from "sonner";
import { IS_LAMBDA_PIPELINE_ACTIVE, isStoragePath, getVideoDerivativeCdnUrl } from "@/lib/cdnConfig";
import VideoUploadPanel from "./VideoUploadPanel";
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

export type VideoProcessingStatus = "pending" | "processing" | "ready" | "failed";

export interface EventVideo {
  id: string;
  file_url: string;
  file_name: string | null;
  created_at: string;
  status?: VideoProcessingStatus | null;
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
  codec?: string | null;
  file_size_bytes?: number | null;
  thumbnail_url?: string | null;
  poster_url?: string | null;
  preview_url?: string | null;
  processing_error?: string | null;
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
  videos: EventVideo[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
  totalVideos: number;
  onUploadFiles?: (files: File[]) => void;
  isUploading?: boolean;
  uploadProgress?: UploadFileProgress[];
  onBulkDelete?: (ids: string[]) => void;
}

const VIDEOS_PER_PAGE = 12;

const STATUS_LABEL: Record<VideoProcessingStatus, string> = {
  pending: "Na fila",
  processing: "Processando",
  ready: "Pronto",
  failed: "Falhou",
};

function formatDuration(seconds?: number | null): string {
  if (!seconds && seconds !== 0) return "—";
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function StatusBadge({ status }: { status?: VideoProcessingStatus | null }) {
  const s = status || "pending";
  const config: Record<VideoProcessingStatus, { icon: JSX.Element; className: string }> = {
    pending: { icon: <Clock className="w-3 h-3" />, className: "bg-secondary text-muted-foreground" },
    processing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, className: "bg-primary/20 text-primary" },
    ready: { icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-lime/20 text-lime" },
    failed: { icon: <AlertCircle className="w-3 h-3" />, className: "bg-destructive/20 text-destructive" },
  };
  const c = config[s];
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold backdrop-blur-sm ${c.className}`}>
      {c.icon}
      {STATUS_LABEL[s]}
    </span>
  );
}

export default function VideoGallery({
  open, onClose, videos, onDelete, isDeleting, totalVideos,
  onUploadFiles, isUploading, uploadProgress = [], onBulkDelete,
}: Props) {
  const [page, setPage] = useState(1);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; bulk: boolean } | null>(null);
  const [player, setPlayer] = useState<EventVideo | null>(null);
  const [infoVideo, setInfoVideo] = useState<EventVideo | null>(null);
  const [posterErrors, setPosterErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    const readyVideos = videos.filter(v => v.status === "ready" && (v.thumbnail_url || v.poster_url));
    if (readyVideos.length === 0) return;

    if (IS_LAMBDA_PIPELINE_ACTIVE) {
      const map: Record<string, string> = {};
      for (const v of readyVideos) {
        if (v.thumbnail_url && !signedUrls[v.thumbnail_url]) {
          const u = getVideoDerivativeCdnUrl(v.thumbnail_url);
          if (u) map[v.thumbnail_url] = u;
        }
      }
      if (Object.keys(map).length > 0) setSignedUrls(prev => ({ ...prev, ...map }));
      return;
    }

    const paths = readyVideos
      .map(v => v.thumbnail_url)
      .filter((p): p is string => !!p && isStoragePath(p) && !signedUrls[p]);
    if (paths.length === 0) return;
    getSignedReadUrls(paths).then(urls => {
      setSignedUrls(prev => ({ ...prev, ...urls }));
    }).catch(console.error);
  }, [open, videos]);

  useEffect(() => {
    if (!player) return;
    const paths = [player.preview_url, player.file_url].filter(
      (p): p is string => !!p && !signedUrls[p]
    );
    if (paths.length === 0) return;
    if (IS_LAMBDA_PIPELINE_ACTIVE && player.preview_url) {
      const u = getVideoDerivativeCdnUrl(player.preview_url);
      if (u) setSignedUrls(prev => ({ ...prev, [player.preview_url as string]: u }));
    }
    const remaining = paths.filter(p => isStoragePath(p) && !(IS_LAMBDA_PIPELINE_ACTIVE && p === player.preview_url));
    if (remaining.length === 0) return;
    getSignedReadUrls(remaining).then(urls => {
      setSignedUrls(prev => ({ ...prev, ...urls }));
    }).catch(console.error);
  }, [player]);

  const validateFiles = (files: File[]): File[] => {
    const MAX = 5 * 1024 * 1024 * 1024;
    const valid: File[] = [];
    const invalidFmt: string[] = [];
    const tooLarge: string[] = [];
    for (const f of files) {
      const name = f.name.toLowerCase();
      const isMp4Mov = f.type === "video/mp4" || f.type === "video/quicktime" || name.endsWith(".mp4") || name.endsWith(".mov");
      if (!isMp4Mov) { invalidFmt.push(f.name); continue; }
      if (f.size > MAX) { tooLarge.push(f.name); continue; }
      valid.push(f);
    }
    if (invalidFmt.length) toast.error("Formato não suportado. Envie apenas vídeos em MP4 ou MOV.");
    if (tooLarge.length) toast.error(`Arquivo acima de 5GB: ${tooLarge.join(", ")}`);
    return valid;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    const dropped = validateFiles(Array.from(e.dataTransfer.files));
    if (dropped.length > 0) onUploadFiles?.(dropped);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploading) return;
    if (e.target.files) {
      const files = validateFiles(Array.from(e.target.files));
      if (files.length > 0) onUploadFiles?.(files);
      e.target.value = "";
    }
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

  const handleDownloadOriginal = async (video: EventVideo) => {
    try {
      const urls = await getSignedReadUrls([video.file_url]);
      const url = urls[video.file_url];
      if (!url) throw new Error("URL indisponível");
      window.open(url, "_blank");
    } catch {
      toast.error("Erro ao gerar link de download do original.");
    }
  };

  if (!open) return null;

  const totalPages = Math.max(1, Math.ceil(videos.length / VIDEOS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = videos.slice((safePage - 1) * VIDEOS_PER_PAGE, safePage * VIDEOS_PER_PAGE);

  const activeUploads = uploadProgress.filter(f => f.status === "uploading" || f.status === "pending");
  const hasActiveUpload = activeUploads.length > 0;
  const overallProgress = uploadProgress.length > 0
    ? Math.round(uploadProgress.reduce((sum, f) => sum + f.progress, 0) / uploadProgress.length)
    : 0;
  const doneCount = uploadProgress.filter(f => f.status === "done").length;
  const errorCount = uploadProgress.filter(f => f.status === "error").length;

  const getUploadSummary = () => {
    if (hasActiveUpload) return `Enviando ${activeUploads.length} de ${uploadProgress.length} vídeo(s)... ${overallProgress}%`;
    if (uploadProgress.length === 0) return "";
    if (errorCount === 0) return `✅ ${doneCount} vídeo(s) enviado(s) com sucesso — processamento em segundo plano`;
    if (doneCount === 0) return `❌ ${errorCount} vídeo(s) falharam no envio`;
    return `${doneCount} enviado(s), ${errorCount} falharam`;
  };

  const readyCount = videos.filter(v => v.status === "ready").length;
  const processingCount = videos.filter(v => v.status === "processing" || v.status === "pending").length;
  const failedCount = videos.filter(v => v.status === "failed").length;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-primary font-bold text-sm">GERENCIADOR DE VÍDEOS</p>
            <p className="text-xs text-muted-foreground">{totalVideos} vídeo(s) no evento</p>
          </div>
          <button onClick={onClose} className="text-primary text-sm font-medium hover:underline">
            Voltar para dashboard do evento
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Prontos</p>
            <p className="text-xl font-bold text-lime">{readyCount}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Processando</p>
            <p className="text-xl font-bold text-primary">{processingCount}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Falharam</p>
            <p className="text-xl font-bold text-destructive">{failedCount}</p>
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !isUploading && document.getElementById("video-upload-input")?.click()}
            className={`border-2 border-dashed rounded-xl p-10 sm:p-16 text-center transition-colors mb-6 ${
              isUploading ? "border-primary/30 bg-primary/5 cursor-not-allowed" : "border-border hover:border-primary/50 cursor-pointer"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-10 h-10 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm text-foreground font-medium">Enviando {uploadProgress.length} vídeo(s)... {overallProgress}%</p>
                <Progress value={overallProgress} className="h-2 mt-3 max-w-xs mx-auto" />
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-foreground">Arraste ou selecione seus vídeos para começar o envio</p>
                <p className="text-xs text-muted-foreground mt-2">MP4 ou MOV • Até 90s de duração • Máximo 5GB por arquivo</p>
              </>
            )}
            <input
              id="video-upload-input"
              type="file"
              multiple
              accept=".mp4,.mov,video/mp4,video/quicktime"
              onChange={handleSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {uploadProgress.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-foreground mb-3">{getUploadSummary()}</p>
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground shadow-lg">
              <span className="text-sm font-medium">{selectedIds.size} vídeo(s) selecionado(s)</span>
              <div className="flex items-center gap-2">
                <button onClick={clearSelection} className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary-foreground/10 transition-colors">
                  Limpar
                </button>
                <button
                  onClick={() => setConfirmDelete({ ids: Array.from(selectedIds), bulk: true })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors min-h-[36px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir selecionados
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {paginated.map((video) => {
              const status = video.status || "pending";
              const posterUrl = video.thumbnail_url ? signedUrls[video.thumbnail_url] : null;
              const isSelected = selectedIds.has(video.id);
              const showPoster = status === "ready" && posterUrl && !posterErrors[video.id];

              return (
                <div key={video.id} className={`relative group rounded-lg overflow-hidden bg-secondary aspect-[4/5] ${isSelected ? "ring-2 ring-primary" : ""}`}>
                  {showPoster ? (
                    <img
                      src={posterUrl}
                      alt={video.file_name || ""}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => setPosterErrors(prev => ({ ...prev, [video.id]: true }))}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/70 p-3 text-center gap-2">
                      {status === "processing" || status === "pending" ? (
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      ) : status === "failed" ? (
                        <AlertCircle className="w-8 h-8 text-destructive" />
                      ) : (
                        <Film className="w-8 h-8 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium text-muted-foreground">
                        {status === "pending" && "Aguardando processamento"}
                        {status === "processing" && "Gerando prévia..."}
                        {status === "failed" && "Falha no processamento"}
                        {status === "ready" && "Prévia indisponível"}
                      </span>
                    </div>
                  )}

                  {status === "ready" && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all cursor-pointer z-10"
                      onClick={() => setPlayer(video)}
                    >
                      <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 z-20">
                    <StatusBadge status={status} />
                    <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setInfoVideo(video); }}
                        title="Informações técnicas"
                        className="p-1.5 rounded bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80 min-w-[32px] min-h-[32px] flex items-center justify-center"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadOriginal(video); }}
                        title="Baixar original"
                        className="p-1.5 rounded bg-black/50 backdrop-blur-sm text-white hover:bg-primary/80 min-w-[32px] min-h-[32px] flex items-center justify-center"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ ids: [video.id], bulk: false }); }}
                        title="Excluir vídeo"
                        className="p-1.5 rounded bg-black/50 backdrop-blur-sm text-white hover:bg-destructive/80 min-w-[32px] min-h-[32px] flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 z-20">
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(video.id)}
                          className="w-4 h-4 rounded border-white/50 cursor-pointer accent-primary"
                        />
                        <span className="text-[10px] text-white/80 truncate max-w-[90px]">
                          {video.file_name ? `...${video.file_name.slice(-16)}` : "vídeo"}
                        </span>
                      </label>
                      {video.duration_seconds != null && (
                        <span className="text-[10px] text-white/90 bg-black/40 px-1.5 py-0.5 rounded">
                          {formatDuration(video.duration_seconds)}
                        </span>
                      )}
                    </div>
                  </div>

                  {status === "failed" && video.processing_error && (
                    <div className="absolute inset-x-0 bottom-8 px-2 z-20">
                      <p className="text-[9px] text-white bg-destructive/80 rounded px-1.5 py-1 truncate" title={video.processing_error}>
                        {video.processing_error}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {videos.length === 0 && uploadProgress.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Film className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum vídeo enviado ainda. Arraste vídeos acima para começar.</p>
            </div>
          )}

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

      {player && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setPlayer(null)}>
          <button onClick={() => setPlayer(null)} className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
          <div className="max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            {player.preview_url && signedUrls[player.preview_url] ? (
              <video
                src={signedUrls[player.preview_url]}
                controls
                autoPlay
                className="w-full max-h-[80vh] rounded-lg bg-black"
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            )}
            <p className="text-xs text-white/60 mt-2 text-center">
              Prévia com marca d'água — mesmo vídeo exibido aos compradores. Use "Baixar original" para o arquivo limpo.
            </p>
          </div>
        </div>
      )}

      <AlertDialog open={!!infoVideo} onOpenChange={(o) => !o && setInfoVideo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Informações técnicas</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-foreground space-y-1.5 text-left">
                <div className="flex justify-between"><span className="text-muted-foreground">Arquivo</span><span className="truncate max-w-[200px]">{infoVideo?.file_name || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span>{STATUS_LABEL[(infoVideo?.status || "pending") as VideoProcessingStatus]}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Duração</span><span>{formatDuration(infoVideo?.duration_seconds)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Resolução</span><span>{infoVideo?.width && infoVideo?.height ? `${infoVideo.width}x${infoVideo.height}` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Codec</span><span>{infoVideo?.codec || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tamanho</span><span>{formatFileSize(infoVideo?.file_size_bytes)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Enviado em</span><span>{infoVideo ? new Date(infoVideo.created_at).toLocaleString("pt-BR") : "—"}</span></div>
                {infoVideo?.processing_error && (
                  <div className="pt-2 border-t border-border mt-2">
                    <p className="text-destructive text-xs">{infoVideo.processing_error}</p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setInfoVideo(null)}>Fechar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.bulk ? `Excluir ${confirmDelete.ids.length} vídeo(s)?` : "Excluir este vídeo?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O vídeo e seus derivados (thumbnail, capa, prévia) serão removidos permanentemente do evento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}