-- Sprint 3 — Motor Antifraude
-- Tabelas de sinais, casos de revisão e regras

CREATE TABLE IF NOT EXISTS public.fraud_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text,
  weight int NOT NULL DEFAULT 10,
  active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fraud_rules TO authenticated;
GRANT ALL ON public.fraud_rules TO service_role;
ALTER TABLE public.fraud_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud_rules admin all" ON public.fraud_rules FOR ALL
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "fraud_rules read auth" ON public.fraud_rules FOR SELECT
  TO authenticated USING (active);

CREATE TABLE IF NOT EXISTS public.fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL, -- 'user' | 'order' | 'referral' | 'participation'
  subject_id uuid,
  user_id uuid,
  rule_key text NOT NULL,
  weight int NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.fraud_signals TO authenticated;
GRANT ALL ON public.fraud_signals TO service_role;
ALTER TABLE public.fraud_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud_signals admin all" ON public.fraud_signals FOR ALL
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "fraud_signals own read" ON public.fraud_signals FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_fraud_signals_subject ON public.fraud_signals(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_user ON public.fraud_signals(user_id);

CREATE TABLE IF NOT EXISTS public.fraud_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  user_id uuid,
  score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | cleared | blocked
  decision_note text,
  reviewer_id uuid,
  reviewed_at timestamptz,
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_type, subject_id)
);
GRANT SELECT ON public.fraud_cases TO authenticated;
GRANT ALL ON public.fraud_cases TO service_role;
ALTER TABLE public.fraud_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fraud_cases admin all" ON public.fraud_cases FOR ALL
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "fraud_cases own read" ON public.fraud_cases FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_fraud_rules_updated BEFORE UPDATE ON public.fraud_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_fraud_cases_updated BEFORE UPDATE ON public.fraud_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed das regras iniciais
INSERT INTO public.fraud_rules (key, description, weight, config) VALUES
  ('self_referral_ip', 'Indicador e indicado compartilham o mesmo IP', 40, '{}'),
  ('self_referral_ua', 'Indicador e indicado compartilham o mesmo user-agent', 15, '{}'),
  ('referral_velocity', 'Mais de 5 indicações em 24h pelo mesmo IP', 25, '{"window_hours":24,"max":5}'),
  ('circular_order', 'Pedido pago cujo comprador é o próprio indicador', 50, '{}'),
  ('participation_farm', 'Mais de 10 participações criadas em 1h para o mesmo fotógrafo', 30, '{"window_hours":1,"max":10}'),
  ('shared_device_cluster', 'Conta nova compartilha IP+UA com 3+ outras contas', 20, '{"min_cluster":3}')
ON CONFLICT (key) DO NOTHING;

-- Função utilitária: registra sinal + atualiza caso
CREATE OR REPLACE FUNCTION public.fraud_register_signal(
  _subject_type text,
  _subject_id uuid,
  _user_id uuid,
  _rule_key text,
  _details jsonb DEFAULT '{}'::jsonb,
  _ip text DEFAULT NULL,
  _ua text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_weight int := 0;
  v_signal_id uuid;
  v_case_id uuid;
  v_active boolean;
BEGIN
  SELECT weight, active INTO v_weight, v_active FROM public.fraud_rules WHERE key = _rule_key;
  IF NOT COALESCE(v_active, false) THEN RETURN NULL; END IF;

  INSERT INTO public.fraud_signals (subject_type, subject_id, user_id, rule_key, weight, details, ip, user_agent)
  VALUES (_subject_type, _subject_id, _user_id, _rule_key, COALESCE(v_weight,0), COALESCE(_details,'{}'::jsonb), _ip, _ua)
  RETURNING id INTO v_signal_id;

  INSERT INTO public.fraud_cases (subject_type, subject_id, user_id, score, signals, status)
  VALUES (_subject_type, _subject_id, _user_id, COALESCE(v_weight,0),
          jsonb_build_array(jsonb_build_object('rule', _rule_key, 'weight', v_weight, 'at', now(), 'details', _details)),
          'pending')
  ON CONFLICT (subject_type, subject_id) DO UPDATE
    SET score = public.fraud_cases.score + EXCLUDED.score,
        signals = public.fraud_cases.signals || EXCLUDED.signals,
        status = CASE WHEN public.fraud_cases.status = 'cleared' THEN 'cleared' ELSE 'pending' END,
        updated_at = now()
  RETURNING id INTO v_case_id;

  RETURN v_signal_id;
END;
$$;

-- Decisão admin
CREATE OR REPLACE FUNCTION public.fraud_decide_case(_case_id uuid, _decision text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_case record;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF _decision NOT IN ('cleared','blocked') THEN
    RAISE EXCEPTION 'invalid_decision';
  END IF;

  UPDATE public.fraud_cases
    SET status = _decision, decision_note = _note, reviewer_id = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE id = _case_id
  RETURNING * INTO v_case;

  IF v_case IS NULL THEN RAISE EXCEPTION 'case_not_found'; END IF;

  -- Aplica consequências apenas se BLOCKED (revisão manual obrigatória)
  IF _decision = 'blocked' THEN
    IF v_case.subject_type = 'referral' THEN
      UPDATE public.referral_earnings
        SET status = 'blocked'
        WHERE id = v_case.subject_id AND status IN ('pending','available');
    ELSIF v_case.subject_type = 'participation' THEN
      DELETE FROM public.event_participations WHERE id = v_case.subject_id;
      IF v_case.user_id IS NOT NULL THEN
        PERFORM public.recalc_photographer_level(v_case.user_id);
      END IF;
    END IF;
  END IF;
END;
$$;

-- Detecção: self-referral por IP/UA no momento da captura
CREATE OR REPLACE FUNCTION public.trg_fraud_check_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- IP idêntico entre referrer e referred (registros recentes do indicador em fraud_signals ou auth metadata seriam ideais; aqui usamos o próprio referral metadata)
  IF NEW.referrer_id = NEW.referred_id THEN
    PERFORM public.fraud_register_signal('referral', NEW.id, NEW.referrer_id, 'self_referral_ip',
      jsonb_build_object('reason','same_user_id'), NULL, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fraud_check_referral ON public.referrals;
CREATE TRIGGER trg_fraud_check_referral AFTER INSERT ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.trg_fraud_check_referral();

-- Detecção: pedido circular (comprador = indicador do fotógrafo)
CREATE OR REPLACE FUNCTION public.trg_fraud_check_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_ref uuid;
BEGIN
  IF NEW.status <> 'pago' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;

  FOR r IN
    SELECT DISTINCT p.photographer_id AS uid
    FROM public.order_items oi
    JOIN public.event_photos p ON p.id = oi.photo_id
    WHERE oi.order_id = NEW.id AND p.photographer_id IS NOT NULL
  LOOP
    SELECT referrer_id INTO v_ref FROM public.referrals WHERE referred_id = r.uid AND status = 'active' LIMIT 1;
    IF v_ref IS NULL THEN CONTINUE; END IF;

    -- comprador identificado por user_id (se houver) ou por email coincidente com perfil do indicador
    IF NEW.user_id IS NOT NULL AND NEW.user_id = v_ref THEN
      PERFORM public.fraud_register_signal('order', NEW.id, v_ref, 'circular_order',
        jsonb_build_object('buyer','self','photographer', r.uid), NULL, NULL);
    ELSIF NEW.client_email IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.user_id = v_ref AND lower(pr.full_name) IS NOT NULL
        AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = v_ref AND lower(u.email) = lower(NEW.client_email))
    ) THEN
      PERFORM public.fraud_register_signal('order', NEW.id, v_ref, 'circular_order',
        jsonb_build_object('buyer_email_match', NEW.client_email), NULL, NULL);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fraud_check_order ON public.orders;
CREATE TRIGGER trg_fraud_check_order AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_fraud_check_order();

-- Detecção: farm de participações
CREATE OR REPLACE FUNCTION public.trg_fraud_check_participation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.event_participations
   WHERE photographer_id = NEW.photographer_id
     AND created_at > now() - interval '1 hour';
  IF v_count > 10 THEN
    PERFORM public.fraud_register_signal('participation', NEW.id, NEW.photographer_id, 'participation_farm',
      jsonb_build_object('count_last_hour', v_count), NULL, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fraud_check_participation ON public.event_participations;
CREATE TRIGGER trg_fraud_check_participation AFTER INSERT ON public.event_participations
  FOR EACH ROW EXECUTE FUNCTION public.trg_fraud_check_participation();

-- Gate: bloquear liberação de comissão se referral_earning tem caso pendente
CREATE OR REPLACE FUNCTION public.release_due_referral_earnings()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  WITH upd AS (
    UPDATE public.referral_earnings re
       SET status = 'available', released_at = now()
     WHERE re.status = 'pending'
       AND re.hold_until IS NOT NULL
       AND re.hold_until <= now()
       AND NOT EXISTS (
         SELECT 1 FROM public.fraud_cases fc
         WHERE fc.subject_type = 'referral' AND fc.subject_id = re.id AND fc.status = 'pending'
       )
    RETURNING 1
  )
  SELECT count(*)::int INTO v_count FROM upd;
  RETURN v_count;
END; $$;
