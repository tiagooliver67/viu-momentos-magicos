
-- 1. Deduplicate event_photos (keep row with orders, else oldest)
WITH ranked AS (
  SELECT p.id,
    row_number() OVER (
      PARTITION BY p.event_id, lower(p.file_name)
      ORDER BY (EXISTS(SELECT 1 FROM public.order_items oi WHERE oi.photo_id = p.id))::int DESC,
               p.created_at ASC,
               p.id ASC
    ) AS rn
  FROM public.event_photos p
  WHERE p.file_name IS NOT NULL
)
DELETE FROM public.event_photos WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Deduplicate event_videos (keep oldest)
WITH ranked_v AS (
  SELECT v.id,
    row_number() OVER (
      PARTITION BY v.event_id, lower(v.file_name)
      ORDER BY v.created_at ASC, v.id ASC
    ) AS rn
  FROM public.event_videos v
  WHERE v.file_name IS NOT NULL
)
DELETE FROM public.event_videos WHERE id IN (SELECT id FROM ranked_v WHERE rn > 1);

-- 3. Partial unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS event_photos_unique_name_per_event
  ON public.event_photos (event_id, lower(file_name))
  WHERE file_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_videos_unique_name_per_event
  ON public.event_videos (event_id, lower(file_name))
  WHERE file_name IS NOT NULL;
