CREATE TABLE public.watermark_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  layers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_watermark_configs_event ON public.watermark_configs(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watermark_configs TO authenticated;
GRANT ALL ON public.watermark_configs TO service_role;

ALTER TABLE public.watermark_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event team can view watermark configs"
ON public.watermark_configs FOR SELECT TO authenticated
USING (public.is_event_organizer(event_id) OR public.is_event_photographer(event_id) OR public.is_super_admin());

CREATE POLICY "Organizers can create watermark configs"
ON public.watermark_configs FOR INSERT TO authenticated
WITH CHECK (public.is_event_organizer(event_id));

CREATE POLICY "Organizers can update watermark configs"
ON public.watermark_configs FOR UPDATE TO authenticated
USING (public.is_event_organizer(event_id))
WITH CHECK (public.is_event_organizer(event_id));

CREATE POLICY "Organizers can delete watermark configs"
ON public.watermark_configs FOR DELETE TO authenticated
USING (public.is_event_organizer(event_id));

CREATE TRIGGER update_watermark_configs_updated_at
BEFORE UPDATE ON public.watermark_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();