
-- Lotes de preço
CREATE TABLE public.registration_price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_event_id uuid NOT NULL REFERENCES public.registration_events(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.registration_price_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizer manages tiers" ON public.registration_price_tiers FOR ALL
  USING (public.is_registration_event_organizer(registration_event_id))
  WITH CHECK (public.is_registration_event_organizer(registration_event_id));
CREATE POLICY "Public reads tiers of published events" ON public.registration_price_tiers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.registration_events e WHERE e.id = registration_event_id AND (e.status <> 'rascunho' OR e.organizer_id = auth.uid())));
CREATE INDEX idx_tiers_event ON public.registration_price_tiers(registration_event_id);

-- Modalidades
CREATE TABLE public.registration_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_event_id uuid NOT NULL REFERENCES public.registration_events(id) ON DELETE CASCADE,
  name text NOT NULL,
  max_slots integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.registration_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizer manages categories" ON public.registration_categories FOR ALL
  USING (public.is_registration_event_organizer(registration_event_id))
  WITH CHECK (public.is_registration_event_organizer(registration_event_id));
CREATE POLICY "Public reads categories of published events" ON public.registration_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.registration_events e WHERE e.id = registration_event_id AND (e.status <> 'rascunho' OR e.organizer_id = auth.uid())));
CREATE INDEX idx_categories_event ON public.registration_categories(registration_event_id);

-- Estoque de camisetas
CREATE TABLE public.registration_shirt_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_event_id uuid NOT NULL REFERENCES public.registration_events(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.registration_shirt_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizer manages shirt stock" ON public.registration_shirt_stock FOR ALL
  USING (public.is_registration_event_organizer(registration_event_id))
  WITH CHECK (public.is_registration_event_organizer(registration_event_id));
CREATE POLICY "Public reads shirt stock of published events" ON public.registration_shirt_stock FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.registration_events e WHERE e.id = registration_event_id AND (e.status <> 'rascunho' OR e.organizer_id = auth.uid())));
CREATE INDEX idx_shirt_event ON public.registration_shirt_stock(registration_event_id);

-- Campos novos em registration_events
ALTER TABLE public.registration_events
  ADD COLUMN regulation_file_url text,
  ADD COLUMN payment_instructions text,
  ADD COLUMN senior_discount_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN senior_discount_min_age integer NOT NULL DEFAULT 60;

-- Campos novos em event_registrations
ALTER TABLE public.event_registrations
  ADD COLUMN price_tier_id uuid REFERENCES public.registration_price_tiers(id) ON DELETE SET NULL,
  ADD COLUMN category_id uuid REFERENCES public.registration_categories(id) ON DELETE SET NULL,
  ADD COLUMN amount_due numeric NOT NULL DEFAULT 0,
  ADD COLUMN senior_discount_applied boolean NOT NULL DEFAULT false;

-- Pública pode ler inscrições agregadas (apenas contadores) — manter RLS atual
-- Para contar vagas/estoque restantes na página pública precisamos de SELECT público.
CREATE POLICY "Public can count registrations of published events" ON public.event_registrations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.registration_events e WHERE e.id = registration_event_id AND e.status <> 'rascunho'));
