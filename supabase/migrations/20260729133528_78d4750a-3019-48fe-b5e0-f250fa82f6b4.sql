CREATE TABLE public.watermark_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  layers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watermark_templates TO authenticated;
GRANT ALL ON public.watermark_templates TO service_role;

ALTER TABLE public.watermark_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own watermark templates"
ON public.watermark_templates FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_watermark_templates_user ON public.watermark_templates(user_id);

CREATE TRIGGER update_watermark_templates_updated_at
BEFORE UPDATE ON public.watermark_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();