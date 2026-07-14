
ALTER TABLE public.event_photos
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_hash text;

ALTER TABLE public.event_videos
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_hash text;

CREATE INDEX IF NOT EXISTS event_photos_event_hash_idx ON public.event_photos(event_id, file_hash);
CREATE INDEX IF NOT EXISTS event_videos_event_hash_idx ON public.event_videos(event_id, file_hash);
