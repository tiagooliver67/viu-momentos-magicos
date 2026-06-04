
-- 1) Progress snapshot per event
CREATE TABLE public.event_indexing_progress (
  event_id uuid PRIMARY KEY,
  total_photos int NOT NULL DEFAULT 0,
  bibs_done int NOT NULL DEFAULT 0,
  bibs_errors int NOT NULL DEFAULT 0,
  faces_done int NOT NULL DEFAULT 0,
  faces_errors int NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_indexing_progress TO authenticated;
GRANT ALL ON public.event_indexing_progress TO service_role;

ALTER TABLE public.event_indexing_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer reads own event progress"
  ON public.event_indexing_progress FOR SELECT TO authenticated
  USING (public.is_event_organizer(event_id) OR public.is_event_photographer(event_id) OR public.is_super_admin());

-- 2) Per-photo status for granular UI
ALTER TABLE public.event_photos
  ADD COLUMN IF NOT EXISTS faces_indexed_at timestamptz,
  ADD COLUMN IF NOT EXISTS indexing_status text NOT NULL DEFAULT 'pending'
    CHECK (indexing_status IN ('pending','processing','done','error'));

CREATE INDEX IF NOT EXISTS idx_event_photos_event_status
  ON public.event_photos(event_id, indexing_status);

-- 3) Trigger to keep total_photos in sync
CREATE OR REPLACE FUNCTION public.sync_event_progress_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.event_indexing_progress (event_id, total_photos, last_updated_at)
    VALUES (NEW.event_id, 1, now())
    ON CONFLICT (event_id) DO UPDATE
      SET total_photos = public.event_indexing_progress.total_photos + 1,
          last_updated_at = now();
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.event_indexing_progress
       SET total_photos = GREATEST(total_photos - 1, 0),
           bibs_done = CASE WHEN OLD.bibs_indexed_at IS NOT NULL THEN GREATEST(bibs_done - 1, 0) ELSE bibs_done END,
           last_updated_at = now()
     WHERE event_id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tg_event_photos_progress ON public.event_photos;
CREATE TRIGGER tg_event_photos_progress
AFTER INSERT OR DELETE ON public.event_photos
FOR EACH ROW EXECUTE FUNCTION public.sync_event_progress_total();

-- 4) Backfill existing events
INSERT INTO public.event_indexing_progress (event_id, total_photos, bibs_done)
SELECT
  event_id,
  COUNT(*)::int AS total_photos,
  COUNT(*) FILTER (WHERE bibs_indexed_at IS NOT NULL)::int AS bibs_done
FROM public.event_photos
GROUP BY event_id
ON CONFLICT (event_id) DO UPDATE
  SET total_photos = EXCLUDED.total_photos,
      bibs_done = EXCLUDED.bibs_done,
      last_updated_at = now();

-- 5) Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_indexing_progress;
ALTER TABLE public.event_indexing_progress REPLICA IDENTITY FULL;
