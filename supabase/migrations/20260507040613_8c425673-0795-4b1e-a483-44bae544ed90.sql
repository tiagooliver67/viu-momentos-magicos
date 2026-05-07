-- Add collaboration fields to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS owner_commission_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collab_note text;

-- Extend event_photographers
ALTER TABLE public.event_photographers
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS invited_at timestamptz NOT NULL DEFAULT now();

-- New table for event partners
CREATE TABLE IF NOT EXISTS public.event_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  partner_user_id uuid,
  partner_email text,
  partner_name text NOT NULL,
  commission_pct numeric NOT NULL DEFAULT 0,
  permissions jsonb NOT NULL DEFAULT '{"view_orders":true,"view_financial":false,"manage_photos":false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer manages partners"
  ON public.event_partners FOR ALL
  USING (public.is_event_organizer(event_id))
  WITH CHECK (public.is_event_organizer(event_id));

CREATE POLICY "Partner sees own entry"
  ON public.event_partners FOR SELECT
  USING (partner_user_id = auth.uid());

CREATE POLICY "Super admin reads all partners"
  ON public.event_partners FOR SELECT
  USING (public.is_super_admin());

-- Limit 2 partners per event
CREATE OR REPLACE FUNCTION public.enforce_partner_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.event_partners WHERE event_id = NEW.event_id) >= 2 THEN
    RAISE EXCEPTION 'Limite de 2 parceiros por evento atingido';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_partner_limit ON public.event_partners;
CREATE TRIGGER trg_enforce_partner_limit
  BEFORE INSERT ON public.event_partners
  FOR EACH ROW EXECUTE FUNCTION public.enforce_partner_limit();
