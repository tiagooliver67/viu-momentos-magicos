import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, CheckCircle2, AlertCircle, Cloud, ShieldCheck, Film } from "lucide-react";
import type { UploadFileProgress } from "./VideoGallery";

interface Props {
  isUploading: boolean;
  uploadProgress: UploadFileProgress[];
  fileByName: Map<string, File>;
  onPickFiles: () => void;
  onDrop: (e: React.DragEvent) => void;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

function formatDuration(s?: number): string | null {
  if (!s && s !== 0) return null;
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  const rem = total % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/** Steps we render per card. Only the reached step lights up. */
type Step = "validating" | "hashing" | "uploading" | "cloud" | "finalizing";

function currentStep(p: UploadFileProgress): Step {
  if (p.status === "done") return "finalizing";
  if (p.status === "error") return "uploading";
  if (p.status === "pending") return "validating";
  // uploading
  if (p.progress >= 0.98) return "cloud";
  if (p.progress > 0) return "uploading";
  return "hashing";
}

function statusLabel(p: UploadFileProgress): string {
  if (p.status === "done") return "Concluído com segurança";
  if (p.status === "error") return p.errorDetail || "Falhou no envio";
  if (p.status === "pending") return "Preparando envio...";
  if (p.progress >= 0.98) return "Gravando na nuvem...";
  return "Enviando vídeo...";
}

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "validating", label: "Validando" },
  { key: "hashing", label: "Calculando hash" },
  { key: "uploading", label: "Enviando" },
  { key: "cloud", label: "Gravando na nuvem" },
  { key: "finalizing", label: "Finalizando" },
];

function stepIndex(s: Step): number {
  return STEP_LABELS.findIndex((x) => x.key === s);
}

function VideoThumb({ file }: { file?: File }) {
  const [poster, setPoster] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!file) return;
    let revoked = false;
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.src = "";
    };

    video.onloadedmetadata = () => {
      setDuration(video.duration || null);
      try {
        video.currentTime = Math.min(1, (video.duration || 1) / 4);
      } catch {
        cleanup();
      }
    };
    video.onseeked = () => {
      try {
        const c = document.createElement("canvas");
        const w = 320;
        const ratio = video.videoWidth && video.videoHeight ? video.videoHeight / video.videoWidth : 9 / 16;
        c.width = w;
        c.height = Math.round(w * ratio);
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, c.width, c.height);
          if (!revoked) setPoster(c.toDataURL("image/jpeg", 0.7));
        }
      } catch {
        // ignore
      } finally {
        cleanup();
      }
    };
    video.onerror = cleanup;

    return () => {
      revoked = true;
      cleanup();
    };
  }, [file]);

  const dur = formatDuration(duration || undefined);

  return (
    <div className="relative w-full sm:w-44 h-28 bg-secondary rounded-xl overflow-hidden border border-border/50 flex-shrink-0">
      {poster ? (
        <img src={poster} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Film className="w-6 h-6 text-muted-foreground/60" />
        </div>
      )}
      {dur && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-md font-bold backdrop-blur-sm">
          {dur}
        </div>
      )}
    </div>
  );
}

function VideoUploadCard({
  progress,
  file,
}: {
  progress: UploadFileProgress;
  file?: File;
}) {
  const step = currentStep(progress);
  const activeIdx = stepIndex(step);
  const isDone = progress.status === "done";
  const isError = progress.status === "error";
  const pct = Math.round(progress.progress * 100);

  return (
    <div
      className={`bg-card rounded-2xl p-4 sm:p-5 shadow-sm border transition-all ${
        isDone
          ? "border-lime/30 opacity-90"
          : isError
          ? "border-destructive/30"
          : "border-border"
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <VideoThumb file={file} />

        <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight truncate">
                {progress.fileName}
              </h3>
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                {formatSize(file?.size)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              {isDone ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-lime bg-lime/10 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Pronto
                </span>
              ) : isError ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-destructive bg-destructive/10 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  Erro
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-[11px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full whitespace-nowrap">
                  <span className="relative flex w-2 h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60"></span>
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-primary"></span>
                  </span>
                  {pct}%
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isDone ? "bg-lime" : isError ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${isDone ? 100 : pct}%` }}
              />
            </div>

            {/* Status line */}
            <p className="text-xs font-medium text-muted-foreground">
              {statusLabel(progress)}
            </p>

            {/* Step breadcrumb — only until finished */}
            {!isDone && !isError && (
              <div className="hidden sm:flex items-center gap-1.5 overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,black_85%,transparent)]">
                {STEP_LABELS.map((s, i) => {
                  const done = i < activeIdx;
                  const active = i === activeIdx;
                  return (
                    <div key={s.key} className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${
                          active
                            ? "text-primary-foreground bg-primary shadow-sm"
                            : done
                            ? "text-primary bg-primary/5"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {s.label}
                      </span>
                      {i < STEP_LABELS.length - 1 && (
                        <span className="text-muted-foreground/30">/</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VideoUploadPanel({
  isUploading,
  uploadProgress,
  fileByName,
  onPickFiles,
  onDrop,
}: Props) {
  // Track upload start time to estimate remaining time.
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (uploadProgress.length > 0 && startRef.current == null) {
      startRef.current = Date.now();
    }
    if (uploadProgress.length === 0) {
      startRef.current = null;
    }
  }, [uploadProgress.length]);

  const stats = useMemo(() => {
    const total = uploadProgress.length;
    const done = uploadProgress.filter((f) => f.status === "done").length;
    const err = uploadProgress.filter((f) => f.status === "error").length;
    const active = uploadProgress.filter((f) => f.status === "uploading").length;
    const waiting = uploadProgress.filter((f) => f.status === "pending").length;
    const overall =
      total > 0
        ? Math.round(
            (uploadProgress.reduce((sum, f) => sum + (f.status === "done" ? 1 : f.progress), 0) /
              total) *
              100,
          )
        : 0;
    let eta = "—";
    if (startRef.current && overall > 3 && overall < 100) {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const totalEstimated = elapsed / (overall / 100);
      eta = formatEta(totalEstimated - elapsed);
    }
    return { total, done, err, active, waiting, overall, eta };
  }, [uploadProgress]);

  const showSummary = uploadProgress.length > 0;
  // Circle math for progress ring (r=28 → circumference ≈ 175.9)
  const CIRC = 175.9;
  const dashOffset = CIRC - (CIRC * stats.overall) / 100;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Enviar vídeos</h2>
          <p className="text-sm text-muted-foreground">
            {showSummary
              ? "Sua produção está sendo preparada para entrega"
              : "MP4 ou MOV • Até 90s de duração • Máximo 5GB por arquivo"}
          </p>
        </div>
        <button
          onClick={onPickFiles}
          disabled={isUploading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
        >
          <Upload className="w-4 h-4" />
          Selecionar vídeos
        </button>
      </div>

      {/* Dropzone */}
      {!showSummary && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={onPickFiles}
          className="bg-card rounded-2xl border-2 border-dashed border-border hover:border-primary/40 transition-colors p-10 sm:p-14 text-center cursor-pointer"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Cloud className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm sm:text-base text-foreground font-medium">
            Arraste seus vídeos aqui ou{" "}
            <span className="text-primary">selecione do seu computador</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            MP4 ou MOV • Até 90s de duração • Máximo 5GB por arquivo
          </p>
        </div>
      )}

      {/* Summary card */}
      {showSummary && (
        <div className="bg-card rounded-2xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    className="text-secondary"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={dashOffset}
                    className="text-primary transition-all duration-700"
                  />
                </svg>
                <span className="absolute text-sm font-bold text-foreground tabular-nums">
                  {stats.overall}%
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {stats.done} enviados de {stats.total}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {stats.active} enviando • {stats.waiting} aguardando
                  {stats.err > 0 ? ` • ${stats.err} falharam` : ""}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Progresso geral
                </span>
              </div>
              <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-700"
                  style={{ width: `${stats.overall}%` }}
                />
              </div>
            </div>

            <div className="md:text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">
                Tempo estimado
              </p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{stats.eta}</p>
            </div>
          </div>
        </div>
      )}

      {/* Per-file cards */}
      {showSummary && (
        <div className="space-y-3">
          {uploadProgress.map((p) => (
            <VideoUploadCard key={p.fileName} progress={p} file={fileByName.get(p.fileName)} />
          ))}
        </div>
      )}

      {/* Trust footer */}
      {showSummary && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary/60" />
            <p className="text-xs font-medium">
              Criptografia ponta a ponta ativa durante o upload
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground/80 text-center max-w-sm">
            Seus vídeos são mantidos em sigilo absoluto. Nada é publicado sem sua autorização.
          </p>
        </div>
      )}
    </div>
  );
}