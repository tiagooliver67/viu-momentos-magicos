ALTER TABLE public.photographer_sites
  ADD COLUMN IF NOT EXISTS ai_bio text,
  ADD COLUMN IF NOT EXISTS ai_bio_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_bio_signature text;