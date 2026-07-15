
CREATE UNIQUE INDEX IF NOT EXISTS event_photos_event_hash_uniq
  ON public.event_photos (event_id, file_hash)
  WHERE file_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_videos_event_hash_uniq
  ON public.event_videos (event_id, file_hash)
  WHERE file_hash IS NOT NULL;
