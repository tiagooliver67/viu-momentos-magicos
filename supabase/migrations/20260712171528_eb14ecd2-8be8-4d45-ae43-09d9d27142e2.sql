-- 1) Novo valor de enum para status "agendado"
ALTER TYPE public.event_status ADD VALUE IF NOT EXISTS 'agendado';

-- 2) Coluna com a data/hora de publicação agendada
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS publish_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_events_publish_at
  ON public.events (publish_at)
  WHERE publish_at IS NOT NULL;

-- 3) Função que promove eventos agendados a "ativo" quando chega a hora
CREATE OR REPLACE FUNCTION public.publish_scheduled_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  WITH upd AS (
    UPDATE public.events
       SET status = 'ativo'::public.event_status,
           publish_at = NULL,
           updated_at = now()
     WHERE status::text = 'agendado'
       AND publish_at IS NOT NULL
       AND publish_at <= now()
    RETURNING 1
  )
  SELECT count(*)::int INTO v_count FROM upd;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_scheduled_events() TO service_role;

-- 4) Cron a cada minuto para promover eventos agendados
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('publish-scheduled-events');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'publish-scheduled-events',
  '* * * * *',
  $cron$ SELECT public.publish_scheduled_events(); $cron$
);