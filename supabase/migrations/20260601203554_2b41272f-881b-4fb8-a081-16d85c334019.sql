
-- 1. Colunas em events primeiro (são referenciadas pela policy abaixo)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS bib_search_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bib_number_pattern text NOT NULL DEFAULT '^\d{1,6}$';

-- 2. Colunas em event_photos
ALTER TABLE public.event_photos
  ADD COLUMN IF NOT EXISTS bibs_indexed_at timestamptz,
  ADD COLUMN IF NOT EXISTS bibs_count int NOT NULL DEFAULT 0;

-- 3. Tabela principal
CREATE TABLE public.photo_bib_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  photo_id uuid NOT NULL,
  number text NOT NULL,
  raw_text text NOT NULL,
  confidence numeric(5,2) NOT NULL,
  bbox jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pbn_event_number ON public.photo_bib_numbers(event_id, number);
CREATE INDEX idx_pbn_photo ON public.photo_bib_numbers(photo_id);

GRANT SELECT ON public.photo_bib_numbers TO anon;
GRANT SELECT ON public.photo_bib_numbers TO authenticated;
GRANT ALL ON public.photo_bib_numbers TO service_role;

ALTER TABLE public.photo_bib_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can search bib numbers in visible events"
ON public.photo_bib_numbers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = photo_bib_numbers.event_id
      AND e.visibility = true
      AND COALESCE(e.bib_search_enabled, true) = true
  )
);

CREATE POLICY "Organizer reads bib numbers"
ON public.photo_bib_numbers FOR SELECT
USING (public.is_event_organizer(event_id));

CREATE POLICY "Photographer reads bib numbers"
ON public.photo_bib_numbers FOR SELECT
USING (public.is_event_photographer(event_id));

CREATE POLICY "Super admin reads all bib numbers"
ON public.photo_bib_numbers FOR SELECT
TO authenticated
USING (public.is_super_admin());

-- 4. Tabela de erros
CREATE TABLE public.bib_detection_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid,
  event_id uuid,
  s3_key text NOT NULL,
  error_code text,
  error_message text,
  retry_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bib_errors_event ON public.bib_detection_errors(event_id);

GRANT SELECT ON public.bib_detection_errors TO authenticated;
GRANT ALL ON public.bib_detection_errors TO service_role;

ALTER TABLE public.bib_detection_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer reads bib errors"
ON public.bib_detection_errors FOR SELECT
USING (event_id IS NULL OR public.is_event_organizer(event_id));

CREATE POLICY "Super admin reads all bib errors"
ON public.bib_detection_errors FOR SELECT
TO authenticated
USING (public.is_super_admin());
