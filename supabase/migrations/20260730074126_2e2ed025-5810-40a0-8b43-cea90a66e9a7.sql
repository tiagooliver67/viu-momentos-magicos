CREATE TABLE public.account_watermark_settings (
  user_id uuid PRIMARY KEY,
  active_kind text NOT NULL DEFAULT 'preset',
  active_preset_id text,
  active_template_id uuid REFERENCES public.watermark_templates(id) ON DELETE SET NULL,
  layers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_watermark_kind_check CHECK (active_kind IN ('preset','template'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_watermark_settings TO authenticated;
GRANT ALL ON public.account_watermark_settings TO service_role;
ALTER TABLE public.account_watermark_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watermark settings" ON public.account_watermark_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_account_watermark_settings_updated_at BEFORE UPDATE ON public.account_watermark_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.watermark_templates (user_id, name, layers) SELECT e.organizer_id, wc.name, wc.layers FROM public.watermark_configs wc JOIN public.events e ON e.id = wc.event_id WHERE e.organizer_id IS NOT NULL AND jsonb_typeof(wc.layers) = 'array' AND jsonb_array_length(wc.layers) > 0 AND NOT EXISTS (SELECT 1 FROM public.watermark_templates wt WHERE wt.user_id = e.organizer_id AND wt.name = wc.name);