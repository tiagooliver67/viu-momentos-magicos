
-- =========================================================
-- Fase 2 — RPCs e triggers de orquestração
-- =========================================================

-- 1) ensure_face_collection: insere ou retorna a collection existente
CREATE OR REPLACE FUNCTION public.ensure_face_collection(_event_id uuid)
RETURNS TABLE(collection_id text, created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collection_id text := 'event_' || replace(_event_id::text, '-', '');
  v_created boolean := false;
BEGIN
  INSERT INTO public.event_face_collections (event_id, collection_id, status)
  VALUES (_event_id, v_collection_id, 'active')
  ON CONFLICT (event_id) DO NOTHING;

  GET DIAGNOSTICS v_created = ROW_COUNT;

  RETURN QUERY
    SELECT efc.collection_id, (v_created::int = 1)
    FROM public.event_face_collections efc
    WHERE efc.event_id = _event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_face_collection(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_face_collection(uuid) TO service_role;

-- 2) claim_face_index_jobs: pega um lote pendente e marca como processing
CREATE OR REPLACE FUNCTION public.claim_face_index_jobs(_event_id uuid, _batch_size int DEFAULT 3)
RETURNS TABLE(job_id uuid, photo_id uuid, s3_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT j.id
    FROM public.face_index_jobs j
    WHERE j.event_id = _event_id
      AND j.status = 'pending'
    ORDER BY j.enqueued_at ASC
    LIMIT _batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.face_index_jobs j
  SET status = 'processing',
      started_at = now(),
      attempts = j.attempts + 1,
      updated_at = now()
  FROM picked
  WHERE j.id = picked.id
  RETURNING j.id, j.photo_id, j.s3_key;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_face_index_jobs(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_face_index_jobs(uuid, int) TO service_role;

-- 3) mark_face_index_done
CREATE OR REPLACE FUNCTION public.mark_face_index_done(_job_id uuid, _faces_count int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.face_index_jobs
  SET status = 'done',
      finished_at = now(),
      error_code = NULL,
      error_message = NULL,
      updated_at = now()
  WHERE id = _job_id;

  -- atualiza contador agregado na collection
  UPDATE public.event_face_collections efc
  SET faces_indexed = efc.faces_indexed + _faces_count,
      last_indexed_at = now(),
      updated_at = now()
  FROM public.face_index_jobs j
  WHERE j.id = _job_id AND j.event_id = efc.event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_face_index_done(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_face_index_done(uuid, int) TO service_role;

-- 4) mark_face_index_error
CREATE OR REPLACE FUNCTION public.mark_face_index_error(
  _job_id uuid,
  _error_code text,
  _error_message text,
  _permanent boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.face_index_jobs
  SET status = CASE WHEN _permanent OR attempts >= 4 THEN 'error' ELSE 'pending' END,
      finished_at = CASE WHEN _permanent OR attempts >= 4 THEN now() ELSE NULL END,
      error_code = _error_code,
      error_message = _error_message,
      updated_at = now()
  WHERE id = _job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_face_index_error(uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_face_index_error(uuid, text, text, boolean) TO service_role;

-- 5) Trigger: a cada nova foto, enfileira job (exceto se evento estiver em on_demand)
CREATE OR REPLACE FUNCTION public.enqueue_face_index_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_face_enabled boolean;
BEGIN
  SELECT face_index_mode, face_search_enabled
    INTO v_mode, v_face_enabled
  FROM public.events
  WHERE id = NEW.event_id;

  IF v_face_enabled IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  -- 'on_demand': não enfileira no upload; será preenchido na 1ª busca facial
  IF v_mode = 'on_demand' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.face_index_jobs (event_id, photo_id, s3_key, status)
  VALUES (NEW.event_id, NEW.id, NEW.file_url, 'pending')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_photos_enqueue_face ON public.event_photos;
CREATE TRIGGER trg_event_photos_enqueue_face
  AFTER INSERT ON public.event_photos
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_face_index_job();

-- 6) sync_event_progress_total adicional: contar faces_done nos jobs
CREATE OR REPLACE FUNCTION public.sync_face_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'done' AND OLD.status <> 'done' THEN
    INSERT INTO public.event_indexing_progress (event_id, total_photos, faces_done, last_updated_at)
    VALUES (NEW.event_id, 0, 1, now())
    ON CONFLICT (event_id) DO UPDATE
      SET faces_done = public.event_indexing_progress.faces_done + 1,
          last_updated_at = now();
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'error' AND OLD.status <> 'error' THEN
    INSERT INTO public.event_indexing_progress (event_id, total_photos, faces_errors, last_updated_at)
    VALUES (NEW.event_id, 0, 1, now())
    ON CONFLICT (event_id) DO UPDATE
      SET faces_errors = public.event_indexing_progress.faces_errors + 1,
          last_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_face_index_jobs_progress ON public.face_index_jobs;
CREATE TRIGGER trg_face_index_jobs_progress
  AFTER UPDATE ON public.face_index_jobs
  FOR EACH ROW EXECUTE FUNCTION public.sync_face_progress();
