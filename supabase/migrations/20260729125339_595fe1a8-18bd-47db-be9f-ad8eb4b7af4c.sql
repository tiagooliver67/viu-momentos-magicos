ALTER TABLE public.photographer_sites
  ADD COLUMN IF NOT EXISTS blur_protection_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blur_protection_pattern text NOT NULL DEFAULT 'faixa',
  ADD COLUMN IF NOT EXISTS blur_protection_devices text NOT NULL DEFAULT 'mobile';

ALTER TABLE public.photographer_sites
  ADD CONSTRAINT photographer_sites_blur_pattern_chk
  CHECK (blur_protection_pattern IN ('diagonal','vertical','horizontal','circular','faixa'));

ALTER TABLE public.photographer_sites
  ADD CONSTRAINT photographer_sites_blur_devices_chk
  CHECK (blur_protection_devices IN ('mobile','all'));