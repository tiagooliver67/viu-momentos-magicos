
-- Enum de tipos de evento do funil
CREATE TYPE public.search_event_type AS ENUM (
  'search_performed',
  'photo_viewed',
  'add_to_cart',
  'checkout_started',
  'purchase_completed'
);

CREATE TYPE public.search_kind AS ENUM (
  'facial',
  'bib',
  'album',
  'none'
);

CREATE TABLE public.search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type public.search_event_type NOT NULL,
  search_kind public.search_kind,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  photo_id uuid,
  order_id uuid,
  has_results boolean,
  results_count int,
  session_id text NOT NULL,
  user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- GRANTs: anon precisa INSERT (atletas sem login) + authenticated INSERT.
-- SELECT fica só para service_role/super_admin (via policy).
GRANT INSERT ON public.search_events TO anon;
GRANT INSERT, SELECT ON public.search_events TO authenticated;
GRANT ALL ON public.search_events TO service_role;

ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode inserir seu próprio evento (session_id sempre presente)
CREATE POLICY "Anyone can insert their own search events"
  ON public.search_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    session_id IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Só super_admin pode ler tudo (para dashboards)
CREATE POLICY "Super admins can read all search events"
  ON public.search_events
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Índices para queries do dashboard
CREATE INDEX idx_search_events_created_at ON public.search_events (created_at DESC);
CREATE INDEX idx_search_events_type_created ON public.search_events (event_type, created_at DESC);
CREATE INDEX idx_search_events_event_id ON public.search_events (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_search_events_session ON public.search_events (session_id, created_at DESC);
CREATE INDEX idx_search_events_user ON public.search_events (user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_search_events_no_results ON public.search_events (event_id, created_at DESC)
  WHERE event_type = 'search_performed' AND has_results = false;

-- Integra ao cleanup_old_logs existente (retenção 365 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_run_id uuid;
  v_results jsonb := '{}'::jsonb;
  v_deleted bigint;
BEGIN
  INSERT INTO public.log_cleanup_runs DEFAULT VALUES RETURNING id INTO v_run_id;

  DELETE FROM public.bib_detection_errors WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('bib_detection_errors', v_deleted);

  DELETE FROM public.admin_audit_log WHERE created_at < now() - interval '365 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('admin_audit_log', v_deleted);

  DELETE FROM public.marketing_events_log WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('marketing_events_log', v_deleted);

  DELETE FROM public.face_search_logs WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('face_search_logs', v_deleted);

  DELETE FROM public.partner_activity_log WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('partner_activity_log', v_deleted);

  -- Novo: search_events (365 dias)
  DELETE FROM public.search_events WHERE created_at < now() - interval '365 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('search_events', v_deleted);

  BEGIN
    DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_results := v_results || jsonb_build_object('cron.job_run_details', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object('cron.job_run_details_error', SQLERRM);
  END;

  BEGIN
    DELETE FROM net._http_response WHERE created < now() - interval '24 hours';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_results := v_results || jsonb_build_object('net._http_response', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object('net._http_response_error', SQLERRM);
  END;

  UPDATE public.log_cleanup_runs
    SET finished_at = now(), results = v_results
    WHERE id = v_run_id;

  RETURN v_results;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.log_cleanup_runs
    SET finished_at = now(), results = v_results, error = SQLERRM
    WHERE id = v_run_id;
  RAISE;
END;
$function$;
