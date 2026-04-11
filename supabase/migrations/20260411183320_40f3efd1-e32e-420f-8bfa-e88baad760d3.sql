-- Withdrawal accounts whitelist (pre-registered accounts)
CREATE TABLE public.withdrawal_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'pix' CHECK (account_type IN ('pix', 'bank')),
  pix_key TEXT,
  pix_key_type TEXT CHECK (pix_key_type IN ('CPF', 'EMAIL', 'PHONE', 'EVP')),
  bank_code TEXT,
  bank_name TEXT,
  agency TEXT,
  account_number TEXT,
  account_type_bank TEXT CHECK (account_type_bank IN ('corrente', 'poupanca')),
  account_holder TEXT,
  cpf_cnpj TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);

ALTER TABLE public.withdrawal_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal accounts"
  ON public.withdrawal_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawal accounts"
  ON public.withdrawal_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own withdrawal accounts"
  ON public.withdrawal_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- No UPDATE policy: accounts must be deleted and re-created (triggers new cooldown)

-- Withdrawal audit logs
CREATE TABLE public.withdrawal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.withdrawal_accounts(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'completed', 'failed', 'blocked')),
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  asaas_transfer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.withdrawal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal logs"
  ON public.withdrawal_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Insert only via service role (edge function)

-- Withdrawal notifications
CREATE TABLE public.withdrawal_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('account_added', 'account_removed', 'withdrawal_requested', 'withdrawal_completed', 'withdrawal_failed', 'suspicious_activity')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.withdrawal_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications as read"
  ON public.withdrawal_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to auto-activate accounts after 24h cooldown
CREATE OR REPLACE FUNCTION public.auto_activate_withdrawal_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.activated_at := NEW.created_at + INTERVAL '24 hours';
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_withdrawal_account_activation
  BEFORE INSERT ON public.withdrawal_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_activate_withdrawal_account();