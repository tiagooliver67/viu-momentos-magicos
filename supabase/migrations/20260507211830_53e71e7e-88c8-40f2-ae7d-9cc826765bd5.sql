
-- Enums
CREATE TYPE public.registration_event_status AS ENUM ('rascunho', 'aberto', 'encerrado', 'cancelado');
CREATE TYPE public.registration_payment_status AS ENUM ('pendente', 'pago', 'cancelado');
CREATE TYPE public.registration_checkin_status AS ENUM ('ausente', 'presente');

-- Tabela: registration_events
CREATE TABLE public.registration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  location TEXT NOT NULL,
  category TEXT,
  max_slots INTEGER,
  regulation TEXT,
  pix_key TEXT,
  pix_amount NUMERIC(10,2),
  whatsapp TEXT,
  status public.registration_event_status NOT NULL DEFAULT 'rascunho',
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  shirt_sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_birth_date BOOLEAN NOT NULL DEFAULT true,
  requires_city BOOLEAN NOT NULL DEFAULT true,
  requires_shirt_size BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_registration_events_organizer ON public.registration_events(organizer_id);
CREATE INDEX idx_registration_events_slug ON public.registration_events(slug);

ALTER TABLE public.registration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published registration events"
ON public.registration_events FOR SELECT
USING (status <> 'rascunho' OR organizer_id = auth.uid() OR public.is_super_admin());

CREATE POLICY "Organizer manages own registration events"
ON public.registration_events FOR ALL
USING (auth.uid() = organizer_id)
WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "Super admin can read all registration events"
ON public.registration_events FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE TRIGGER update_registration_events_updated_at
BEFORE UPDATE ON public.registration_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: event_registrations
CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_event_id UUID NOT NULL REFERENCES public.registration_events(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  birth_date DATE,
  category TEXT,
  shirt_size TEXT,
  notes TEXT,
  payment_proof_url TEXT,
  payment_status public.registration_payment_status NOT NULL DEFAULT 'pendente',
  checkin_status public.registration_checkin_status NOT NULL DEFAULT 'ausente',
  checked_in_at TIMESTAMPTZ,
  qr_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_registrations_event ON public.event_registrations(registration_event_id);
CREATE INDEX idx_event_registrations_user ON public.event_registrations(user_id);
CREATE INDEX idx_event_registrations_email ON public.event_registrations(email);

ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_registration_event_organizer(_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.registration_events
    WHERE id = _event_id AND organizer_id = auth.uid()
  )
$$;

CREATE POLICY "Public can insert registrations"
ON public.event_registrations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Organizer manages registrations of own events"
ON public.event_registrations FOR ALL
USING (public.is_registration_event_organizer(registration_event_id))
WITH CHECK (public.is_registration_event_organizer(registration_event_id));

CREATE POLICY "Logged user views own registrations"
ON public.event_registrations FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.jwt() ->> 'email') = email
);

CREATE POLICY "Super admin reads all registrations"
ON public.event_registrations FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE TRIGGER update_event_registrations_updated_at
BEFORE UPDATE ON public.event_registrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('registration-assets', 'registration-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read registration assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'registration-assets');

CREATE POLICY "Anyone can upload registration assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'registration-assets');

CREATE POLICY "Authenticated can update own registration assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'registration-assets');

CREATE POLICY "Authenticated can delete own registration assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'registration-assets');
