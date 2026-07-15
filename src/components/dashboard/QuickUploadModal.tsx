import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Camera, ArrowRight } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import UploadModal from "@/components/event/UploadModal";
import { useS3Upload } from "@/hooks/useS3Upload";
import { toast } from "sonner";
import { getCoverUrl } from "@/lib/eventCover";
import DuplicateFilesModal, { type DuplicateResolution } from "@/components/event/DuplicateFilesModal";
import { detectDuplicates, uniqueName, renameFile, type DuplicateEntry } from "@/lib/duplicateDetection";

interface Props {
  open: boolean;
  onClose: () => void;
  type: "photos" | "videos";
}

function UploadForEvent({ eventId, eventName, type, onDone }: { eventId: string; eventName: string; type: "photos" | "videos"; onDone: () => void }) {
  const uploader = useS3Upload({ eventId, type: type === "photos" ? "fotos" : "videos" });
  const queryClient = useQueryClient();
  const [dupState, setDupState] = useState<{ duplicates: DuplicateEntry[]; fresh: File[] } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(true);

  const runUpload = (toUpload: File[]) => {
    if (toUpload.length === 0) {
      toast.info("Nenhum arquivo novo para enviar.");
      onDone();
      return;
    }
    uploader.mutate(toUpload as any, {
      onSuccess: () => { toast.success(`Enviado para ${eventName}`); onDone(); },
      onError: (e: any) => toast.error(e?.message || "Falha no envio"),
    });
  };

  const handleFiles = async (files: File[]) => {
    const tableName = type === "photos" ? "event_photos" : "event_videos";
    const { data, error } = await supabase
      .from(tableName)
      .select("id, file_name, file_size")
      .eq("event_id", eventId);
    if (error) {
      toast.error("Falha ao verificar duplicados: " + error.message);
      return;
    }
    const existing = (data || []).map((r: any) => ({
      id: r.id,
      file_name: r.file_name,
      file_size: typeof r.file_size === "number" ? r.file_size : null,
    }));
    const { fresh, duplicates } = detectDuplicates(files, existing);

    if (duplicates.length === 0) {
      setPickerOpen(false);
      runUpload(fresh);
      return;
    }
    setPickerOpen(false);
    setDupState({ duplicates, fresh });
  };

  const handleDupResolution = async (choice: DuplicateResolution) => {
    if (!dupState) return;
    const { duplicates, fresh } = dupState;
    const tableName = type === "photos" ? "event_photos" : "event_videos";
    const existingNames = new Set<string>();
    for (const d of duplicates) existingNames.add((d.existing.file_name || "").toLowerCase());
    for (const f of fresh) existingNames.add(f.name.toLowerCase());

    let toUpload: File[] = [...fresh];

    if (choice === "ignore") {
      // fresh only
    } else if (choice === "keep-both") {
      for (const d of duplicates) {
        const newName = uniqueName(d.file.name, existingNames);
        existingNames.add(newName.toLowerCase());
        toUpload.push(renameFile(d.file, newName));
      }
    } else if (choice === "replace") {
      try {
        const ids = duplicates.map(d => d.existing.id);
        const { error } = await supabase.from(tableName).delete().in("id", ids);
        if (error) throw error;
        toUpload.push(...duplicates.map(d => d.file));
      } catch (err: any) {
        toast.error("Falha ao substituir: " + (err.message || err));
        setDupState(null);
        return;
      }
    } else if (choice === "update") {
      const toDelete: string[] = [];
      for (const d of duplicates) {
        if (d.identical) continue;
        toDelete.push(d.existing.id);
        toUpload.push(d.file);
      }
      if (toDelete.length > 0) {
        try {
          const { error } = await supabase.from(tableName).delete().in("id", toDelete);
          if (error) throw error;
        } catch (err: any) {
          toast.error("Falha ao atualizar: " + (err.message || err));
          setDupState(null);
          return;
        }
      }
    }

    setDupState(null);
    queryClient.invalidateQueries({ queryKey: [type === "photos" ? "event-photos" : "event-videos", eventId] });
    runUpload(toUpload);
  };

  return (
    <>
      <UploadModal
        open={pickerOpen}
        onClose={onDone}
        isUploading={uploader.isPending}
        type={type}
        onUpload={handleFiles}
      />
      <DuplicateFilesModal
        open={!!dupState}
        onClose={() => { setDupState(null); onDone(); }}
        onConfirm={handleDupResolution}
        type={type}
        duplicates={dupState?.duplicates ?? []}
        freshCount={dupState?.fresh.length ?? 0}
      />
    </>
  );
}

export default function QuickUploadModal({ open, onClose, type }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["quick-upload-events", user?.id],
    enabled: !!user?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, cover_url, event_date, location, status")
        .eq("organizer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(9);
      if (error) throw error;
      return data || [];
    },
  });

  if (!open) return null;

  if (selected) {
    return (
      <UploadForEvent
        eventId={selected.id}
        eventName={selected.name}
        type={type}
        onDone={() => { setSelected(null); onClose(); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-foreground text-lg">
              Enviar {type === "photos" ? "fotos" : "vídeos"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Selecione um dos seus últimos 9 eventos</p>
          </div>
          <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-10 text-center">Carregando eventos...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-10">
            <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">Nenhum evento criado ainda</p>
            <Link
              to="/dashboard/criar-evento"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
            >
              Criar evento <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.map((ev: any) => {
              const disabled = ev.status === "inativo";
              return (
                <button
                  key={ev.id}
                  disabled={disabled}
                  onClick={() => setSelected({ id: ev.id, name: ev.name })}
                  className={`text-left rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="h-24 bg-muted relative overflow-hidden">
                    {ev.cover_url ? (
                      <img src={getCoverUrl(ev.cover_url, 400) ?? undefined} alt={ev.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-foreground truncate">{ev.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{ev.location}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(ev.event_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}