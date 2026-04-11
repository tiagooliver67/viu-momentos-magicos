
ALTER TABLE public.photographer_sites
  ADD COLUMN IF NOT EXISTS watermark_position text DEFAULT 'tile',
  ADD COLUMN IF NOT EXISTS watermark_opacity integer DEFAULT 25,
  ADD COLUMN IF NOT EXISTS watermark_size integer DEFAULT 30;
