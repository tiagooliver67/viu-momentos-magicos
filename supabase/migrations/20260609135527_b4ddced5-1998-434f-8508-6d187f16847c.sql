-- 1) Desativar trigger automático de enfileiramento em event_photos
DROP TRIGGER IF EXISTS trg_enqueue_face_index_job ON public.event_photos;
DROP TRIGGER IF EXISTS enqueue_face_index_job_trigger ON public.event_photos;
DROP TRIGGER IF EXISTS event_photos_enqueue_face_index ON public.event_photos;
-- A função public.enqueue_face_index_job() é preservada para uso manual/backfill.

-- 2) Índice único parcial para deduplicação (event_id, photo_id) em jobs ativos
CREATE UNIQUE INDEX IF NOT EXISTS face_index_jobs_active_unique
  ON public.face_index_jobs (event_id, photo_id)
  WHERE status IN ('pending', 'processing', 'done');

-- 3) RPC para backfill manual: enfileira jobs para todas as fotos do evento sem indexação
CREATE OR REPLACE FUNCTION public.enqueue_event_backfill(_event_id uuid, _force boolean DEFAULT false)
RETURNS TABLE(enqueued integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- Autorização: super_admin OU organizador do evento OU fotógrafo do evento
  IF NOT (
    public.is_super_admin()
    OR public.is_event_organizer(_event_id)
    OR public.is_event_photographer(_event_id)
  ) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  WITH ins AS (
    INSERT INTO public.face_index_jobs (event_id, photo_id, s3_key, status)
    SELECT p.event_id, p.id, p.file_url, 'pending'
    FROM public.event_photos p
    WHERE p.event_id = _event_id
      AND (_force OR p.faces_indexed_at IS NULL)
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::int INTO v_count FROM ins;

  RETURN QUERY SELECT v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_event_backfill(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_event_backfill(uuid, boolean) TO authenticated, service_role;