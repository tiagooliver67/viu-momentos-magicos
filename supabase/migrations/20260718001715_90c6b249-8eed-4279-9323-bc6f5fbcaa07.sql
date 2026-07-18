ALTER TABLE public.hero_slides
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS poster_path text;

ALTER TABLE public.hero_slides
  DROP CONSTRAINT IF EXISTS hero_slides_media_type_check;
ALTER TABLE public.hero_slides
  ADD CONSTRAINT hero_slides_media_type_check CHECK (media_type IN ('image','video'));