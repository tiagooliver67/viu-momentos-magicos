
-- =====================================
-- Marketing Module — Fase 1
-- =====================================

-- Pixels de tracking (Meta, Google, TikTok, GTM)
CREATE TABLE public.marketing_pixels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('meta','gtm','google_ads','tiktok')),
  pixel_id text NOT NULL,
  access_token text,
  label text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, pixel_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_pixels TO authenticated;
GRANT ALL ON public.marketing_pixels TO service_role;
-- Leitura pública dos pixel_ids ativos (para o tracker injetar scripts nas galerias públicas)
GRANT SELECT ON public.marketing_pixels TO anon;

ALTER TABLE public.marketing_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages own pixels"
  ON public.marketing_pixels FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Leitura pública apenas de campos não-sensíveis (o cliente precisa saber o pixel_id do dono do evento)
CREATE POLICY "public reads active pixels"
  ON public.marketing_pixels FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE TRIGGER trg_marketing_pixels_updated_at
  BEFORE UPDATE ON public.marketing_pixels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_marketing_pixels_user ON public.marketing_pixels (user_id, active);


-- Log de eventos de marketing (funnel tracking)
CREATE TABLE public.marketing_events_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  session_id text,
  visitor_id text,
  event_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketing_events_log TO authenticated;
GRANT INSERT ON public.marketing_events_log TO anon, authenticated;
GRANT ALL ON public.marketing_events_log TO service_role;

ALTER TABLE public.marketing_events_log ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode inserir eventos (tracker anônimo)
CREATE POLICY "anyone can log marketing events"
  ON public.marketing_events_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Só o fotógrafo dono vê seus próprios logs
CREATE POLICY "photographer reads own logs"
  ON public.marketing_events_log FOR SELECT
  TO authenticated
  USING (auth.uid() = photographer_id);

CREATE INDEX idx_marketing_events_log_photographer ON public.marketing_events_log (photographer_id, created_at DESC);
CREATE INDEX idx_marketing_events_log_event ON public.marketing_events_log (event_id, event_name, created_at DESC);
