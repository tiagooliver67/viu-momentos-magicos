ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS resolution text NOT NULL DEFAULT 'high';

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_resolution_check;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_resolution_check
  CHECK (resolution IN ('high', 'low'));