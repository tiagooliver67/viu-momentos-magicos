ALTER TABLE public.discount_packages
  ADD COLUMN IF NOT EXISTS package_type text NOT NULL DEFAULT 'closed',
  ADD COLUMN IF NOT EXISTS display_mode text NOT NULL DEFAULT 'from',
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS base_photo_price numeric(10,2);