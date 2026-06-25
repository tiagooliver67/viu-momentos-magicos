ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS commission_photographer_share numeric(4,2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS commission_client_share numeric(4,2) NOT NULL DEFAULT 0;