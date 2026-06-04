import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IndexingProgress {
  event_id: string;
  total_photos: number;
  bibs_done: number;
  bibs_errors: number;
  faces_done: number;
  faces_errors: number;
  last_updated_at: string;
}

/**
 * Realtime subscription to event_indexing_progress for a given event.
 * Returns null until the first fetch resolves.
 */
export function useIndexingProgress(eventId: string | null | undefined) {
  const [progress, setProgress] = useState<IndexingProgress | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let mounted = true;

    supabase
      .from("event_indexing_progress")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted && data) setProgress(data as IndexingProgress);
      });

    const channel = supabase
      .channel(`indexing-progress:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_indexing_progress",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (!mounted) return;
          const next = (payload.new ?? payload.old) as IndexingProgress | undefined;
          if (next) setProgress(next);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return progress;
}