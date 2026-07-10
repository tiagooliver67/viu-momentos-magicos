
CREATE TABLE IF NOT EXISTS public.marketing_automation_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  autopilot_enabled boolean NOT NULL DEFAULT false,
  daily_budget_limit numeric(10,2),
  auto_approve boolean NOT NULL DEFAULT false,
  last_scan_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_automation_settings TO authenticated;
GRANT ALL ON public.marketing_automation_settings TO service_role;
ALTER TABLE public.marketing_automation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_automation_settings" ON public.marketing_automation_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_marketing_automation_settings_updated BEFORE UPDATE ON public.marketing_automation_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.marketing_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  event_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_marketing_suggestions_user_status ON public.marketing_suggestions(user_id, status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_suggestions TO authenticated;
GRANT ALL ON public.marketing_suggestions TO service_role;
ALTER TABLE public.marketing_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_marketing_suggestions" ON public.marketing_suggestions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_marketing_suggestions_updated BEFORE UPDATE ON public.marketing_suggestions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.marketing_consultant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_consultant_msgs_user_time ON public.marketing_consultant_messages(user_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.marketing_consultant_messages TO authenticated;
GRANT ALL ON public.marketing_consultant_messages TO service_role;
ALTER TABLE public.marketing_consultant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_consultant_messages" ON public.marketing_consultant_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
