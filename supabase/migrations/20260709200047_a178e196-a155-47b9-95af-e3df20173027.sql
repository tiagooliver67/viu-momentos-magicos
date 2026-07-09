CREATE TABLE public.marketing_insights_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  signature text NOT NULL,
  insights jsonb NOT NULL,
  model text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, signature)
);

GRANT SELECT ON public.marketing_insights_cache TO authenticated;
GRANT ALL ON public.marketing_insights_cache TO service_role;

ALTER TABLE public.marketing_insights_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own insights cache"
  ON public.marketing_insights_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_marketing_insights_cache_updated_at
  BEFORE UPDATE ON public.marketing_insights_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_marketing_insights_cache_user ON public.marketing_insights_cache(user_id, generated_at DESC);