
-- Tabela de auditoria das execuções do cleanup
CREATE TABLE IF NOT EXISTS public.log_cleanup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);

GRANT SELECT ON public.log_cleanup_runs TO authenticated;
GRANT ALL ON public.log_cleanup_runs TO service_role;

ALTER TABLE public.log_cleanup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin reads cleanup runs"
  ON public.log_cleanup_runs
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Função principal de limpeza
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_results jsonb := '{}'::jsonb;
  v_deleted bigint;
BEGIN
  INSERT INTO public.log_cleanup_runs DEFAULT VALUES RETURNING id INTO v_run_id;

  -- bib_detection_errors: 30 dias
  DELETE FROM public.bib_detection_errors WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('bib_detection_errors', v_deleted);

  -- admin_audit_log: 365 dias
  DELETE FROM public.admin_audit_log WHERE created_at < now() - interval '365 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('admin_audit_log', v_deleted);

  -- marketing_events_log: 90 dias
  DELETE FROM public.marketing_events_log WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('marketing_events_log', v_deleted);

  -- face_search_logs: 60 dias
  DELETE FROM public.face_search_logs WHERE created_at < now() - interval '60 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('face_search_logs', v_deleted);

  -- partner_activity_log: 180 dias
  DELETE FROM public.partner_activity_log WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  v_results := v_results || jsonb_build_object('partner_activity_log', v_deleted);

  -- cron.job_run_details: 7 dias (schema cron precisa existir)
  BEGIN
    DELETE FROM cron.job_run_details WHERE start_time < now() - interval '7 days';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_results := v_results || jsonb_build_object('cron.job_run_details', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object('cron.job_run_details_error', SQLERRM);
  END;

  -- net._http_response: 24 horas
  BEGIN
    DELETE FROM net._http_response WHERE created < now() - interval '24 hours';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    v_results := v_results || jsonb_build_object('net._http_response', v_deleted);
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object('net._http_response_error', SQLERRM);
  END;

  -- withdrawal_logs: INTENCIONALMENTE nunca apagado (registro financeiro)

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
$$;
