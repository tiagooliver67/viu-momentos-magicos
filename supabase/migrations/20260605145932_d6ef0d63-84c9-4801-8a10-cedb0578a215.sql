
CREATE TABLE IF NOT EXISTS public.sync_state (
  table_name text PRIMARY KEY,
  last_synced_at timestamptz NOT NULL DEFAULT '1970-01-01'::timestamptz,
  last_run_at timestamptz,
  last_rows_synced integer DEFAULT 0,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_state TO authenticated;
GRANT ALL ON public.sync_state TO service_role;

ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manages sync_state"
  ON public.sync_state FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Habilita pg_cron e pg_net para agendamento
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
