
-- =========================================================
-- FASE 1 — RECONHECIMENTO FACIAL (Schema)
-- =========================================================

-- 1) events: novos campos
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS face_index_mode text NOT NULL DEFAULT 'auto'
    CHECK (face_index_mode IN ('auto','on_demand','eager')),
  ADD COLUMN IF NOT EXISTS face_search_enabled boolean NOT NULL DEFAULT true;

-- =========================================================
-- 2) event_face_collections
-- =========================================================
CREATE TABLE IF NOT EXISTS public.event_face_collections (
  event_id uuid PRIMARY KEY,
  collection_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','deleting','deleted','error')),
  faces_indexed integer NOT NULL DEFAULT 0,
  last_indexed_at timestamptz,
  last_searched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.event_face_collections TO authenticated;
GRANT ALL ON public.event_face_collections TO service_role;

ALTER TABLE public.event_face_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer/photographer reads collection"
  ON public.event_face_collections FOR SELECT TO authenticated
  USING (is_event_organizer(event_id) OR is_event_photographer(event_id) OR is_super_admin());

-- =========================================================
-- 3) event_photo_faces
-- =========================================================
CREATE TABLE IF NOT EXISTS public.event_photo_faces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  photo_id uuid NOT NULL,
  rekognition_face_id text NOT NULL,
  external_image_id text,
  bounding_box jsonb NOT NULL,
  confidence numeric NOT NULL,
  quality jsonb,
  pose jsonb,
  face_crop_s3_key text,
  face_crop_generated_at timestamptz,
  indexed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_photo_faces_event_face_idx
  ON public.event_photo_faces(event_id, rekognition_face_id);
CREATE INDEX IF NOT EXISTS event_photo_faces_photo_idx
  ON public.event_photo_faces(photo_id);
CREATE UNIQUE INDEX IF NOT EXISTS event_photo_faces_face_unique
  ON public.event_photo_faces(rekognition_face_id);

GRANT SELECT ON public.event_photo_faces TO authenticated;
GRANT ALL ON public.event_photo_faces TO service_role;

ALTER TABLE public.event_photo_faces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event team reads faces"
  ON public.event_photo_faces FOR SELECT TO authenticated
  USING (is_event_organizer(event_id) OR is_event_photographer(event_id) OR is_super_admin());

CREATE POLICY "Public reads faces of visible events"
  ON public.event_photo_faces FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_photo_faces.event_id
      AND e.visibility = true
      AND COALESCE(e.face_search_enabled, true) = true
  ));

-- =========================================================
-- 4) face_index_jobs
-- =========================================================
CREATE TABLE IF NOT EXISTS public.face_index_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  photo_id uuid NOT NULL,
  s3_key text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','error','skipped')),
  attempts integer NOT NULL DEFAULT 0,
  error_code text,
  error_message text,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS face_index_jobs_event_status_idx
  ON public.face_index_jobs(event_id, status);
CREATE INDEX IF NOT EXISTS face_index_jobs_photo_idx
  ON public.face_index_jobs(photo_id);

GRANT SELECT ON public.face_index_jobs TO authenticated;
GRANT ALL ON public.face_index_jobs TO service_role;

ALTER TABLE public.face_index_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event team reads index jobs"
  ON public.face_index_jobs FOR SELECT TO authenticated
  USING (is_event_organizer(event_id) OR is_event_photographer(event_id) OR is_super_admin());

-- =========================================================
-- 5) face_search_logs
-- =========================================================
CREATE TABLE IF NOT EXISTS public.face_search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_id uuid NOT NULL,
  selfie_s3_key text,
  selfie_quality jsonb,
  matches_count integer NOT NULL DEFAULT 0,
  best_similarity numeric,
  avg_similarity numeric,
  duration_ms integer,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS face_search_logs_event_idx ON public.face_search_logs(event_id);
CREATE INDEX IF NOT EXISTS face_search_logs_user_idx ON public.face_search_logs(user_id);
CREATE INDEX IF NOT EXISTS face_search_logs_created_idx ON public.face_search_logs(created_at DESC);

GRANT SELECT ON public.face_search_logs TO authenticated;
GRANT ALL ON public.face_search_logs TO service_role;

ALTER TABLE public.face_search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User reads own search logs"
  ON public.face_search_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Event team reads search logs"
  ON public.face_search_logs FOR SELECT TO authenticated
  USING (is_event_organizer(event_id) OR is_event_photographer(event_id) OR is_super_admin());

-- =========================================================
-- 6) face_search_matches
-- =========================================================
CREATE TABLE IF NOT EXISTS public.face_search_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_log_id uuid NOT NULL,
  event_id uuid NOT NULL,
  face_id uuid,
  photo_id uuid NOT NULL,
  similarity numeric NOT NULL,
  rank integer NOT NULL,
  clicked_at timestamptz,
  added_to_cart_at timestamptz,
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS face_search_matches_log_idx ON public.face_search_matches(search_log_id);
CREATE INDEX IF NOT EXISTS face_search_matches_photo_idx ON public.face_search_matches(photo_id);
CREATE INDEX IF NOT EXISTS face_search_matches_event_idx ON public.face_search_matches(event_id);

GRANT SELECT ON public.face_search_matches TO authenticated;
GRANT ALL ON public.face_search_matches TO service_role;

ALTER TABLE public.face_search_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event team reads search matches"
  ON public.face_search_matches FOR SELECT TO authenticated
  USING (is_event_organizer(event_id) OR is_event_photographer(event_id) OR is_super_admin());

CREATE POLICY "User reads matches of own searches"
  ON public.face_search_matches FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.face_search_logs l
    WHERE l.id = face_search_matches.search_log_id
      AND l.user_id = auth.uid()
  ));

-- =========================================================
-- 7) updated_at triggers
-- =========================================================
CREATE TRIGGER trg_event_face_collections_updated
  BEFORE UPDATE ON public.event_face_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_face_index_jobs_updated
  BEFORE UPDATE ON public.face_index_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 8) photo_search_index (materialized view: OCR + Facial)
-- =========================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.photo_search_index AS
SELECT
  p.id          AS photo_id,
  p.event_id    AS event_id,
  COALESCE(
    array_agg(DISTINCT b.number) FILTER (WHERE b.number IS NOT NULL),
    ARRAY[]::text[]
  )             AS bib_numbers,
  COALESCE(
    array_agg(DISTINCT f.rekognition_face_id) FILTER (WHERE f.rekognition_face_id IS NOT NULL),
    ARRAY[]::text[]
  )             AS face_ids,
  COUNT(DISTINCT f.id) AS face_count,
  COUNT(DISTINCT b.id) AS bib_count,
  MAX(p.created_at)    AS photo_created_at
FROM public.event_photos p
LEFT JOIN public.photo_bib_numbers b ON b.photo_id = p.id
LEFT JOIN public.event_photo_faces f ON f.photo_id = p.id
GROUP BY p.id, p.event_id;

CREATE UNIQUE INDEX IF NOT EXISTS photo_search_index_pk
  ON public.photo_search_index(photo_id);
CREATE INDEX IF NOT EXISTS photo_search_index_event_idx
  ON public.photo_search_index(event_id);
CREATE INDEX IF NOT EXISTS photo_search_index_bibs_gin
  ON public.photo_search_index USING gin(bib_numbers);
CREATE INDEX IF NOT EXISTS photo_search_index_faces_gin
  ON public.photo_search_index USING gin(face_ids);

GRANT SELECT ON public.photo_search_index TO authenticated, anon;
GRANT ALL ON public.photo_search_index TO service_role;

-- Helper function to refresh (chamada por job/edge function, não em trigger inline)
CREATE OR REPLACE FUNCTION public.refresh_photo_search_index()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.photo_search_index;
$$;
