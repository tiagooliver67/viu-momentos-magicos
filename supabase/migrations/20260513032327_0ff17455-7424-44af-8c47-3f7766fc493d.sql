ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS progressive_discount_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS progressive_discount_rules jsonb NOT NULL DEFAULT '[]'::jsonb;