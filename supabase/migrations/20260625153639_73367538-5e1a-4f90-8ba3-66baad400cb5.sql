
-- 0) Extensões em referral_earnings (status + commission_amount + retenção/pagamento)
ALTER TABLE public.referral_earnings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS commission_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS hold_until timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_earnings_status_chk') THEN
    ALTER TABLE public.referral_earnings
      ADD CONSTRAINT referral_earnings_status_chk
      CHECK (status IN ('pending','available','requested','paid','reversed'));
  END IF;
END $$;

UPDATE public.referral_earnings
  SET hold_until = COALESCE(hold_until, created_at),
      commission_amount = COALESCE(commission_amount, ROUND(amount * commission_pct / 100.0, 2))
  WHERE hold_until IS NULL OR commission_amount IS NULL;

-- 1) partner_applications
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  pix_key text,
  pix_key_type text CHECK (pix_key_type IN ('cpf','cnpj','email','phone','random')),
  accepted_terms_at timestamptz,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.partner_applications TO authenticated;
GRANT ALL ON public.partner_applications TO service_role;
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_app select" ON public.partner_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "partner_app insert" ON public.partner_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "partner_app update" ON public.partner_applications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_super_admin());
CREATE TRIGGER trg_partner_apps_upd BEFORE UPDATE ON public.partner_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) partner_payouts
CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  pix_key text NOT NULL,
  pix_key_type text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','paid','rejected')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  paid_at timestamptz,
  tx_id text,
  notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.partner_payouts TO authenticated;
GRANT ALL ON public.partner_payouts TO service_role;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payouts select" ON public.partner_payouts
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "payouts insert" ON public.partner_payouts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "payouts admin update" ON public.partner_payouts
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
CREATE TRIGGER trg_partner_payouts_upd BEFORE UPDATE ON public.partner_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) FK payout_id em referral_earnings (depois da tabela existir)
ALTER TABLE public.referral_earnings
  ADD COLUMN IF NOT EXISTS payout_id uuid REFERENCES public.partner_payouts(id) ON DELETE SET NULL;

-- 4) partner_activity_log
CREATE TABLE IF NOT EXISTS public.partner_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_activity_log TO authenticated;
GRANT ALL ON public.partner_activity_log TO service_role;
ALTER TABLE public.partner_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity log select" ON public.partner_activity_log
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin());

-- 5) Funções
CREATE OR REPLACE FUNCTION public.is_partner_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.referral_earnings
    WHERE referrer_id = _user_id AND created_at > now() - interval '90 days'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_partner_approved(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_applications pa
    JOIN public.photographer_levels pl ON pl.user_id = pa.user_id
    JOIN public.level_rules lr ON lr.level = pl.current_level
    WHERE pa.user_id = _user_id
      AND pa.status = 'approved'
      AND lr.sort_order >= COALESCE((SELECT sort_order FROM public.level_rules WHERE level::text = 'ouro'), 3)
  );
$$;

CREATE OR REPLACE FUNCTION public.release_due_referral_earnings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  WITH upd AS (
    UPDATE public.referral_earnings
       SET status = 'available', released_at = now()
     WHERE status = 'pending'
       AND hold_until IS NOT NULL
       AND hold_until <= now()
    RETURNING 1
  )
  SELECT count(*)::int INTO v_count FROM upd;
  RETURN v_count;
END; $$;

-- 6) Trigger de crédito com retenção 30d + gate de adesão
CREATE OR REPLACE FUNCTION public.trg_referral_credit_on_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_referrer uuid;
  v_pct numeric;
  v_level text;
  r record;
BEGIN
  IF NEW.status <> 'pago' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;

  FOR r IN
    SELECT DISTINCT p.photographer_id AS uid
    FROM public.order_items oi
    JOIN public.event_photos p ON p.id = oi.photo_id
    WHERE oi.order_id = NEW.id AND p.photographer_id IS NOT NULL
  LOOP
    SELECT referrer_id INTO v_referrer FROM public.referrals
      WHERE referred_id = r.uid AND status = 'active' LIMIT 1;
    IF v_referrer IS NULL THEN CONTINUE; END IF;
    IF NOT public.is_partner_approved(v_referrer) THEN CONTINUE; END IF;

    SELECT current_level INTO v_level FROM public.photographer_levels WHERE user_id = v_referrer;
    SELECT commission_pct INTO v_pct FROM public.level_rules WHERE level = COALESCE(v_level,'bronze');
    IF v_pct IS NULL OR v_pct = 0 THEN CONTINUE; END IF;

    INSERT INTO public.referral_earnings (
      referrer_id, referred_id, order_id, amount, commission_pct, commission_amount,
      status, hold_until
    )
    VALUES (
      v_referrer, r.uid, NEW.id, NEW.amount, v_pct,
      ROUND(NEW.amount * v_pct / 100.0, 2),
      'pending', now() + interval '30 days'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END; $$;

-- 7) Indexes
CREATE INDEX IF NOT EXISTS idx_re_referrer_status ON public.referral_earnings(referrer_id, status);
CREATE INDEX IF NOT EXISTS idx_re_hold ON public.referral_earnings(hold_until) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pp_user_status ON public.partner_payouts(user_id, status);
