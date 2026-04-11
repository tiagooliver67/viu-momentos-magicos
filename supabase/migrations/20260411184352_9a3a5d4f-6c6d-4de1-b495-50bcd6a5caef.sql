
CREATE TABLE public.two_factor_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('withdrawal', 'add_account')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  used BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.two_factor_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own 2FA codes"
  ON public.two_factor_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Insert and update only via service role (edge function)

-- Index for fast lookup of active codes
CREATE INDEX idx_two_factor_codes_user_action ON public.two_factor_codes (user_id, action, used, expires_at);
