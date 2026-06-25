
-- =========================================================
-- SPRINT 1 — JORNADA (mérito puro)
-- =========================================================

-- 1) Novas colunas em level_rules (critérios baseados em mérito)
ALTER TABLE public.level_rules
  ADD COLUMN IF NOT EXISTS min_eligible_events integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_attended_participations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_eligible_revenue numeric NOT NULL DEFAULT 0;

-- 2) Novas colunas em photographer_levels (métricas de mérito)
ALTER TABLE public.photographer_levels
  ADD COLUMN IF NOT EXISTS eligible_events_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attended_participations_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eligible_revenue_total numeric NOT NULL DEFAULT 0;

-- 3) eligibility_rules: regras configuráveis para "Evento Elegível"
CREATE TABLE IF NOT EXISTS public.eligibility_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.eligibility_rules TO authenticated;
GRANT ALL ON public.eligibility_rules TO service_role;

ALTER TABLE public.eligibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read eligibility rules"
  ON public.eligibility_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins manage eligibility rules"
  ON public.eligibility_rules FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TRIGGER trg_eligibility_rules_updated_at
  BEFORE UPDATE ON public.eligibility_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed das regras padrão
INSERT INTO public.eligibility_rules (key, value, description) VALUES
  ('event_min_photos', '10'::jsonb, 'Mínimo de fotos processadas para evento contar como elegível'),
  ('event_requires_published', 'true'::jsonb, 'Evento precisa estar publicado para ser elegível'),
  ('event_requires_paid_order', 'false'::jsonb, 'Evento precisa ter pelo menos 1 venda paga'),
  ('event_min_age_days', '0'::jsonb, 'Idade mínima do evento em dias')
ON CONFLICT (key) DO NOTHING;

-- 4) event_participations: 1 cliente único por evento (atendido)
CREATE TABLE IF NOT EXISTS public.event_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL,
  client_key text NOT NULL,
  client_user_id uuid,
  first_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  attended_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, photographer_id, client_key)
);

CREATE INDEX IF NOT EXISTS idx_event_participations_photographer
  ON public.event_participations (photographer_id);
CREATE INDEX IF NOT EXISTS idx_event_participations_event
  ON public.event_participations (event_id);

GRANT SELECT ON public.event_participations TO authenticated;
GRANT ALL ON public.event_participations TO service_role;

ALTER TABLE public.event_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographer reads own participations"
  ON public.event_participations FOR SELECT TO authenticated
  USING (photographer_id = auth.uid() OR public.is_super_admin());

-- 5) Trigger: registra participação quando pedido vira pago
CREATE OR REPLACE FUNCTION public.trg_register_participation_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_client_key text;
BEGIN
  IF NEW.status <> 'pago' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Define client_key: prefere user_id, fallback hash de email+cpf
  v_client_key := COALESCE(
    NEW.user_id::text,
    md5(coalesce(NEW.customer_email,'') || '|' || coalesce(NEW.customer_cpf,''))
  );

  -- Para cada (evento, fotógrafo) presente no pedido, registra uma participação única
  FOR r IN
    SELECT DISTINCT p.event_id, p.photographer_id
    FROM public.order_items oi
    JOIN public.event_photos p ON p.id = oi.photo_id
    WHERE oi.order_id = NEW.id
      AND p.photographer_id IS NOT NULL
      AND p.event_id IS NOT NULL
  LOOP
    INSERT INTO public.event_participations
      (event_id, photographer_id, client_key, client_user_id, first_order_id)
    VALUES
      (r.event_id, r.photographer_id, v_client_key, NEW.user_id, NEW.id)
    ON CONFLICT (event_id, photographer_id, client_key) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_register_participation ON public.orders;
CREATE TRIGGER trg_register_participation
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_register_participation_on_paid();

-- 6) Função is_event_eligible
CREATE OR REPLACE FUNCTION public.is_event_eligible(_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_photos int;
  v_requires_published boolean;
  v_requires_paid boolean;
  v_min_age int;
  v_photos int;
  v_published boolean;
  v_has_paid boolean;
  v_created timestamptz;
BEGIN
  SELECT COALESCE((value)::text::int, 10) INTO v_min_photos
    FROM public.eligibility_rules WHERE key = 'event_min_photos' AND active;
  SELECT COALESCE((value)::text::boolean, true) INTO v_requires_published
    FROM public.eligibility_rules WHERE key = 'event_requires_published' AND active;
  SELECT COALESCE((value)::text::boolean, false) INTO v_requires_paid
    FROM public.eligibility_rules WHERE key = 'event_requires_paid_order' AND active;
  SELECT COALESCE((value)::text::int, 0) INTO v_min_age
    FROM public.eligibility_rules WHERE key = 'event_min_age_days' AND active;

  SELECT (status = 'publicado' OR status = 'published'), created_at
    INTO v_published, v_created
    FROM public.events WHERE id = _event_id;

  IF v_published IS NULL THEN RETURN false; END IF;

  IF v_requires_published AND NOT COALESCE(v_published, false) THEN RETURN false; END IF;

  IF v_min_age > 0 AND v_created > now() - (v_min_age || ' days')::interval THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_photos FROM public.event_photos WHERE event_id = _event_id;
  IF v_photos < COALESCE(v_min_photos, 0) THEN RETURN false; END IF;

  IF v_requires_paid THEN
    SELECT EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.order_items oi ON oi.order_id = o.id
      JOIN public.event_photos p ON p.id = oi.photo_id
      WHERE p.event_id = _event_id AND o.status = 'pago'
    ) INTO v_has_paid;
    IF NOT v_has_paid THEN RETURN false; END IF;
  END IF;

  RETURN true;
END;
$$;

-- 7) Reescreve recalc_photographer_level para usar as 3 métricas novas
--    Mantém compat com colunas antigas (events_count/sales_count/revenue_total)
--    e GARANTE não-regressão (exceto remoção de Embaixador).
CREATE OR REPLACE FUNCTION public.recalc_photographer_level(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events int := 0;
  v_eligible_events int := 0;
  v_sales int := 0;
  v_attended int := 0;
  v_revenue numeric := 0;
  v_eligible_revenue numeric := 0;
  v_referrals int := 0;
  v_profile_complete boolean := false;
  v_has_document boolean := false;
  v_current text;
  v_current_order int := 0;
  v_is_ambassador boolean := false;
  v_new text;
  v_new_order int := 0;
  r record;
  v_match boolean;
  v_ach record;
  v_crit jsonb;
  v_type text;
  v_val numeric;
BEGIN
  -- Eventos totais (compat)
  SELECT count(*) INTO v_events
  FROM public.events e
  WHERE e.organizer_id = _user_id
     OR EXISTS (SELECT 1 FROM public.event_photographers ep WHERE ep.event_id = e.id AND ep.photographer_id = _user_id);

  -- Eventos elegíveis (novo)
  SELECT count(*) INTO v_eligible_events
  FROM public.events e
  WHERE (e.organizer_id = _user_id
         OR EXISTS (SELECT 1 FROM public.event_photographers ep WHERE ep.event_id = e.id AND ep.photographer_id = _user_id))
    AND public.is_event_eligible(e.id);

  -- Vendas (compat — deprecated)
  SELECT count(*) INTO v_sales
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status = 'pago'
    AND EXISTS (SELECT 1 FROM public.event_photos p WHERE p.id = oi.photo_id AND p.photographer_id = _user_id);

  -- Participações atendidas (novo — 1 cliente por evento)
  SELECT count(*) INTO v_attended
  FROM public.event_participations
  WHERE photographer_id = _user_id;

  -- Faturamento total (compat)
  SELECT COALESCE(sum(o.amount),0) INTO v_revenue
  FROM public.orders o
  WHERE o.status = 'pago'
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.event_photos p ON p.id = oi.photo_id
      WHERE oi.order_id = o.id AND p.photographer_id = _user_id
    );

  -- Faturamento elegível (novo — só de eventos elegíveis)
  SELECT COALESCE(sum(o.amount),0) INTO v_eligible_revenue
  FROM public.orders o
  WHERE o.status = 'pago'
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.event_photos p ON p.id = oi.photo_id
      WHERE oi.order_id = o.id
        AND p.photographer_id = _user_id
        AND public.is_event_eligible(p.event_id)
    );

  SELECT count(*) INTO v_referrals FROM public.referrals WHERE referrer_id = _user_id AND status = 'active';

  SELECT (full_name IS NOT NULL AND length(full_name) > 2 AND phone IS NOT NULL),
         (cpf_cnpj IS NOT NULL AND length(cpf_cnpj) >= 11)
    INTO v_profile_complete, v_has_document
  FROM public.profiles WHERE user_id = _user_id;

  v_profile_complete := COALESCE(v_profile_complete, false);
  v_has_document := COALESCE(v_has_document, false);

  SELECT current_level, is_ambassador INTO v_current, v_is_ambassador
  FROM public.photographer_levels WHERE user_id = _user_id;

  v_current := COALESCE(v_current, 'bronze');
  v_is_ambassador := COALESCE(v_is_ambassador, false);

  v_new := 'bronze';
  v_new_order := 1;

  -- Avaliação usando MÉTRICAS DE MÉRITO (eligible_events + attended + eligible_revenue)
  FOR r IN SELECT * FROM public.level_rules WHERE manual_only = false ORDER BY sort_order ASC LOOP
    IF r.match_mode = 'and' THEN
      v_match := (v_eligible_events >= COALESCE(r.min_eligible_events, r.min_events))
             AND (v_attended >= COALESCE(r.min_attended_participations, 0))
             AND (v_eligible_revenue >= COALESCE(r.min_eligible_revenue, r.min_revenue))
             AND (NOT r.requires_profile_complete OR v_profile_complete)
             AND (NOT r.requires_document OR v_has_document);
    ELSE
      v_match := (
        (COALESCE(r.min_eligible_events, r.min_events) > 0 AND v_eligible_events >= COALESCE(r.min_eligible_events, r.min_events))
        OR (COALESCE(r.min_attended_participations, 0) > 0 AND v_attended >= COALESCE(r.min_attended_participations, 0))
        OR (COALESCE(r.min_eligible_revenue, r.min_revenue) > 0 AND v_eligible_revenue >= COALESCE(r.min_eligible_revenue, r.min_revenue))
      ) AND (NOT r.requires_profile_complete OR v_profile_complete)
        AND (NOT r.requires_document OR v_has_document);
    END IF;

    IF v_match AND r.sort_order > v_new_order THEN
      v_new := r.level;
      v_new_order := r.sort_order;
    END IF;
  END LOOP;

  IF v_is_ambassador THEN
    v_new := 'embaixador';
    SELECT sort_order INTO v_new_order FROM public.level_rules WHERE level = 'embaixador';
  END IF;

  -- LOCK DE NÃO-REGRESSÃO: nunca rebaixa (exceto via remoção de embaixador, tratado fora)
  SELECT COALESCE(sort_order, 0) INTO v_current_order FROM public.level_rules WHERE level = v_current;
  IF v_new_order < v_current_order AND NOT v_is_ambassador THEN
    v_new := v_current;
    v_new_order := v_current_order;
  END IF;

  INSERT INTO public.photographer_levels (
    user_id, current_level,
    events_count, sales_count, revenue_total, referrals_count,
    eligible_events_count, attended_participations_count, eligible_revenue_total,
    history, updated_at
  )
  VALUES (
    _user_id, v_new::public.photographer_level,
    v_events, v_sales, v_revenue, v_referrals,
    v_eligible_events, v_attended, v_eligible_revenue,
    jsonb_build_array(jsonb_build_object('level', v_new, 'at', now())), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    events_count = EXCLUDED.events_count,
    sales_count = EXCLUDED.sales_count,
    revenue_total = EXCLUDED.revenue_total,
    referrals_count = EXCLUDED.referrals_count,
    eligible_events_count = EXCLUDED.eligible_events_count,
    attended_participations_count = EXCLUDED.attended_participations_count,
    eligible_revenue_total = EXCLUDED.eligible_revenue_total,
    history = CASE
      WHEN public.photographer_levels.current_level::text <> EXCLUDED.current_level::text
      THEN public.photographer_levels.history || jsonb_build_array(jsonb_build_object('level', EXCLUDED.current_level, 'at', now()))
      ELSE public.photographer_levels.history
    END,
    updated_at = now();

  -- Conquistas (suporta novos tipos: eligible_events, attended_participations, eligible_revenue)
  FOR v_ach IN SELECT * FROM public.achievements WHERE active = true LOOP
    v_crit := v_ach.criteria;
    v_type := v_crit->>'type';
    v_val := (v_crit->>'value')::numeric;
    v_match := false;

    IF v_type = 'events' AND v_events >= v_val THEN v_match := true;
    ELSIF v_type = 'eligible_events' AND v_eligible_events >= v_val THEN v_match := true;
    ELSIF v_type = 'sales' AND v_sales >= v_val THEN v_match := true;
    ELSIF v_type = 'attended_participations' AND v_attended >= v_val THEN v_match := true;
    ELSIF v_type = 'revenue' AND v_revenue >= v_val THEN v_match := true;
    ELSIF v_type = 'eligible_revenue' AND v_eligible_revenue >= v_val THEN v_match := true;
    ELSIF v_type = 'referrals' AND v_referrals >= v_val THEN v_match := true;
    END IF;

    IF v_match THEN
      INSERT INTO public.photographer_achievements (user_id, achievement_id)
      VALUES (_user_id, v_ach.id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_new;
END;
$$;
