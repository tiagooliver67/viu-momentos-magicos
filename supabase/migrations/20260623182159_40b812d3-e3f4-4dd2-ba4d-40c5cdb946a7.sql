
-- ============================================================
-- Sistema de Níveis, Conquistas e Programa de Parceiros
-- ============================================================

-- Enum de níveis
DO $$ BEGIN
  CREATE TYPE public.photographer_level AS ENUM ('bronze','prata','ouro','diamante','embaixador');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- 1) level_rules — configuração editável pelo admin
-- ------------------------------------------------------------
CREATE TABLE public.level_rules (
  level public.photographer_level PRIMARY KEY,
  sort_order int NOT NULL,
  min_events int NOT NULL DEFAULT 0,
  min_sales int NOT NULL DEFAULT 0,
  min_revenue numeric NOT NULL DEFAULT 0,
  requires_profile_complete boolean NOT NULL DEFAULT false,
  requires_document boolean NOT NULL DEFAULT false,
  manual_only boolean NOT NULL DEFAULT false,
  match_mode text NOT NULL DEFAULT 'and', -- 'and' = todos os critérios; 'or' = qualquer
  commission_pct numeric NOT NULL DEFAULT 0,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.level_rules TO anon, authenticated;
GRANT ALL ON public.level_rules TO service_role;
ALTER TABLE public.level_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "level_rules_read_all" ON public.level_rules FOR SELECT USING (true);
CREATE POLICY "level_rules_admin_write" ON public.level_rules
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Seeds
INSERT INTO public.level_rules (level, sort_order, min_events, min_sales, min_revenue, requires_profile_complete, requires_document, manual_only, match_mode, commission_pct, benefits, message) VALUES
('bronze',     1, 0, 0, 0, false, false, false, 'and', 0,
  '["Perfil ativo","Criação de eventos","Upload de fotos","Venda de fotos"]'::jsonb,
  'Bem-vindo à comunidade Viu Foto.'),
('prata',      2, 5, 30, 0, true, true, false, 'and', 0,
  '["Selo Prata"]'::jsonb,
  'Fotógrafo ativo e validado.'),
('ouro',       3, 15, 500, 10000, false, false, false, 'or', 1,
  '["Selo Ouro","Programa de Parceiros desbloqueado","Link de indicação exclusivo","Dashboard de indicações","Estatísticas avançadas","Destaque leve no ranking"]'::jsonb,
  'Você já provou que gera resultados.'),
('diamante',   4, 50, 10000, 100000, false, false, false, 'or', 1.5,
  '["Perfil Premium","Destaque nas buscas","Prioridade no suporte","Convites para testes beta","Canal direto com a equipe"]'::jsonb,
  'Referência dentro da plataforma.'),
('embaixador', 5, 0, 0, 0, false, false, true, 'and', 2,
  '["Selo Embaixador","Comissão diferenciada","Perfil destacado","Convites para campanhas","Canal direto com a equipe","Participação em testes e decisões futuras"]'::jsonb,
  'Representante oficial da Viu Foto.');

-- ------------------------------------------------------------
-- 2) achievements — catálogo
-- ------------------------------------------------------------
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  icon text,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb, -- { type: 'events'|'sales'|'revenue'|'referrals'|'category_sales', value: n, category?: text }
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_read_all" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "achievements_admin_write" ON public.achievements
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

INSERT INTO public.achievements (code, title, description, icon, criteria, sort_order) VALUES
('first_event',     'Primeiro Evento',         'Publicou seu primeiro evento',                    '🏆', '{"type":"events","value":1}'::jsonb, 1),
('sales_100',       '100 Fotos Vendidas',      'Atingiu 100 fotos vendidas',                      '📷', '{"type":"sales","value":100}'::jsonb, 2),
('sales_1000',      '1.000 Fotos Vendidas',    'Atingiu 1.000 fotos vendidas',                    '🔥', '{"type":"sales","value":1000}'::jsonb, 3),
('sales_10000',     '10.000 Fotos Vendidas',   'Atingiu 10.000 fotos vendidas',                   '⭐', '{"type":"sales","value":10000}'::jsonb, 4),
('first_referral',  'Primeiro Fotógrafo Indicado', 'Indicou seu primeiro fotógrafo',              '🤝', '{"type":"referrals","value":1}'::jsonb, 5),
('expert_corrida',  'Especialista em Corridas','50 vendas em eventos de corrida',                 '🏃', '{"type":"category_sales","value":50,"category":"corrida"}'::jsonb, 6),
('expert_motocross','Especialista em Motocross','50 vendas em eventos de motocross',              '🏍', '{"type":"category_sales","value":50,"category":"motocross"}'::jsonb, 7),
('expert_formatura','Especialista em Formaturas','50 vendas em eventos de formatura',             '🎓', '{"type":"category_sales","value":50,"category":"formatura"}'::jsonb, 8);

-- ------------------------------------------------------------
-- 3) photographer_achievements
-- ------------------------------------------------------------
CREATE TABLE public.photographer_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX ph_ach_user_idx ON public.photographer_achievements(user_id);

GRANT SELECT ON public.photographer_achievements TO authenticated;
GRANT SELECT ON public.photographer_achievements TO anon;
GRANT ALL ON public.photographer_achievements TO service_role;
ALTER TABLE public.photographer_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_ach_read_all" ON public.photographer_achievements FOR SELECT USING (true);
CREATE POLICY "ph_ach_admin_write" ON public.photographer_achievements
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------
-- 4) photographer_levels — cache e permanência
-- ------------------------------------------------------------
CREATE TABLE public.photographer_levels (
  user_id uuid PRIMARY KEY,
  current_level public.photographer_level NOT NULL DEFAULT 'bronze',
  is_ambassador boolean NOT NULL DEFAULT false,
  events_count int NOT NULL DEFAULT 0,
  sales_count int NOT NULL DEFAULT 0,
  revenue_total numeric NOT NULL DEFAULT 0,
  referrals_count int NOT NULL DEFAULT 0,
  history jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{level, at}]
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.photographer_levels TO anon, authenticated;
GRANT ALL ON public.photographer_levels TO service_role;
ALTER TABLE public.photographer_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ph_levels_read_all" ON public.photographer_levels FOR SELECT USING (true);
CREATE POLICY "ph_levels_admin_write" ON public.photographer_levels
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------
-- 5) referrals — Programa de Parceiros
-- ------------------------------------------------------------
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  code text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | active
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  UNIQUE (referred_id)
);

CREATE INDEX referrals_referrer_idx ON public.referrals(referrer_id);
CREATE INDEX referrals_code_idx ON public.referrals(code);

GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_read_own" ON public.referrals
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid() OR public.is_super_admin());
CREATE POLICY "referrals_insert_self" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (referred_id = auth.uid());
CREATE POLICY "referrals_admin_all" ON public.referrals
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- referral_code em photographer_sites (gerado a partir do slug ou aleatório)
ALTER TABLE public.photographer_sites ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- ------------------------------------------------------------
-- 6) referral_earnings
-- ------------------------------------------------------------
CREATE TABLE public.referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  order_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  commission_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ref_earnings_referrer_idx ON public.referral_earnings(referrer_id);

GRANT SELECT ON public.referral_earnings TO authenticated;
GRANT ALL ON public.referral_earnings TO service_role;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ref_earnings_read_own" ON public.referral_earnings
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR public.is_super_admin());

-- ------------------------------------------------------------
-- 7) Função: recalc_photographer_level(uuid)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_photographer_level(_user_id uuid)
RETURNS public.photographer_level
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events int := 0;
  v_sales int := 0;
  v_revenue numeric := 0;
  v_referrals int := 0;
  v_profile_complete boolean := false;
  v_has_document boolean := false;
  v_is_ambassador boolean := false;
  v_current public.photographer_level := 'bronze';
  v_new public.photographer_level := 'bronze';
  v_current_order int := 0;
  v_new_order int := 0;
  r record;
  v_match boolean;
  v_history jsonb;
  v_ach record;
  v_crit jsonb;
  v_type text;
  v_val numeric;
  v_cat text;
  v_cat_sales int;
BEGIN
  -- Stats
  SELECT count(*) INTO v_events
  FROM public.events e
  WHERE e.organizer_id = _user_id
     OR EXISTS (SELECT 1 FROM public.event_photographers ep WHERE ep.event_id = e.id AND ep.photographer_id = _user_id);

  SELECT count(*) INTO v_sales
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status IN ('pago','paid','confirmed')
    AND EXISTS (
      SELECT 1 FROM public.event_photos p
      WHERE p.id = oi.photo_id AND p.photographer_id = _user_id
    );

  SELECT COALESCE(sum(o.amount),0) INTO v_revenue
  FROM public.orders o
  WHERE o.status IN ('pago','paid','confirmed')
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.event_photos p ON p.id = oi.photo_id
      WHERE oi.order_id = o.id AND p.photographer_id = _user_id
    );

  SELECT count(*) INTO v_referrals
  FROM public.referrals WHERE referrer_id = _user_id AND status = 'active';

  SELECT (full_name IS NOT NULL AND length(full_name) > 2 AND phone IS NOT NULL),
         (cpf_cnpj IS NOT NULL AND length(cpf_cnpj) >= 11)
    INTO v_profile_complete, v_has_document
  FROM public.profiles WHERE user_id = _user_id;

  v_profile_complete := COALESCE(v_profile_complete, false);
  v_has_document := COALESCE(v_has_document, false);

  -- Nível atual + flag de embaixador
  SELECT current_level, is_ambassador INTO v_current, v_is_ambassador
  FROM public.photographer_levels WHERE user_id = _user_id;

  v_current := COALESCE(v_current, 'bronze');

  SELECT sort_order INTO v_current_order FROM public.level_rules WHERE level = v_current;

  -- Determina maior nível elegível (exceto embaixador, sempre manual)
  v_new := 'bronze';
  v_new_order := 1;

  FOR r IN
    SELECT * FROM public.level_rules WHERE manual_only = false ORDER BY sort_order ASC
  LOOP
    IF r.match_mode = 'and' THEN
      v_match := (v_events >= r.min_events)
             AND (v_sales >= r.min_sales)
             AND (v_revenue >= r.min_revenue)
             AND (NOT r.requires_profile_complete OR v_profile_complete)
             AND (NOT r.requires_document OR v_has_document);
    ELSE
      v_match := (
        (r.min_events > 0 AND v_events >= r.min_events)
        OR (r.min_sales > 0 AND v_sales >= r.min_sales)
        OR (r.min_revenue > 0 AND v_revenue >= r.min_revenue)
      )
      AND (NOT r.requires_profile_complete OR v_profile_complete)
      AND (NOT r.requires_document OR v_has_document);
    END IF;

    IF v_match AND r.sort_order > v_new_order THEN
      v_new := r.level;
      v_new_order := r.sort_order;
    END IF;
  END LOOP;

  -- Embaixador permanece se já flag manual
  IF v_is_ambassador THEN
    v_new := 'embaixador';
  END IF;

  -- Permanência: só sobe
  SELECT COALESCE(sort_order, 0) INTO v_current_order FROM public.level_rules WHERE level = v_current;
  IF v_new_order < v_current_order AND NOT v_is_ambassador THEN
    v_new := v_current;
    v_new_order := v_current_order;
  END IF;

  -- Upsert
  INSERT INTO public.photographer_levels (user_id, current_level, events_count, sales_count, revenue_total, referrals_count, history, updated_at)
  VALUES (_user_id, v_new, v_events, v_sales, v_revenue, v_referrals,
    jsonb_build_array(jsonb_build_object('level', v_new, 'at', now())), now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_level = EXCLUDED.current_level,
    events_count = EXCLUDED.events_count,
    sales_count = EXCLUDED.sales_count,
    revenue_total = EXCLUDED.revenue_total,
    referrals_count = EXCLUDED.referrals_count,
    history = CASE
      WHEN public.photographer_levels.current_level <> EXCLUDED.current_level
      THEN public.photographer_levels.history || jsonb_build_array(jsonb_build_object('level', EXCLUDED.current_level, 'at', now()))
      ELSE public.photographer_levels.history
    END,
    updated_at = now();

  -- Desbloqueia conquistas
  FOR v_ach IN SELECT * FROM public.achievements WHERE active = true LOOP
    v_crit := v_ach.criteria;
    v_type := v_crit->>'type';
    v_val := (v_crit->>'value')::numeric;
    v_cat := v_crit->>'category';
    v_match := false;

    IF v_type = 'events' AND v_events >= v_val THEN v_match := true;
    ELSIF v_type = 'sales' AND v_sales >= v_val THEN v_match := true;
    ELSIF v_type = 'revenue' AND v_revenue >= v_val THEN v_match := true;
    ELSIF v_type = 'referrals' AND v_referrals >= v_val THEN v_match := true;
    ELSIF v_type = 'category_sales' AND v_cat IS NOT NULL THEN
      SELECT count(*) INTO v_cat_sales
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      JOIN public.event_photos p ON p.id = oi.photo_id
      JOIN public.events e ON e.id = p.event_id
      WHERE o.status IN ('pago','paid','confirmed')
        AND p.photographer_id = _user_id
        AND lower(e.category) = lower(v_cat);
      IF v_cat_sales >= v_val THEN v_match := true; END IF;
    END IF;

    IF v_match THEN
      INSERT INTO public.photographer_achievements (user_id, achievement_id)
      VALUES (_user_id, v_ach.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalc_photographer_level(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------
-- 8) Triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_recalc_on_order_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.status IN ('pago','paid','confirmed') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    FOR r IN
      SELECT DISTINCT p.photographer_id AS uid
      FROM public.order_items oi
      JOIN public.event_photos p ON p.id = oi.photo_id
      WHERE oi.order_id = NEW.id AND p.photographer_id IS NOT NULL
    LOOP
      PERFORM public.recalc_photographer_level(r.uid);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_recalc_level ON public.orders;
CREATE TRIGGER orders_recalc_level
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_on_order_paid();

CREATE OR REPLACE FUNCTION public.trg_recalc_on_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organizer_id IS NOT NULL THEN
    PERFORM public.recalc_photographer_level(NEW.organizer_id);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS events_recalc_level ON public.events;
CREATE TRIGGER events_recalc_level
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_on_event();

-- ------------------------------------------------------------
-- 9) Helpers — Embaixador e gerar referral_code
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_ambassador(_user_id uuid, _enabled boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.photographer_levels (user_id, is_ambassador, current_level)
  VALUES (_user_id, _enabled, CASE WHEN _enabled THEN 'embaixador'::public.photographer_level ELSE 'bronze'::public.photographer_level END)
  ON CONFLICT (user_id) DO UPDATE SET
    is_ambassador = _enabled,
    current_level = CASE WHEN _enabled THEN 'embaixador'::public.photographer_level ELSE public.photographer_levels.current_level END,
    updated_at = now();

  -- Se removeu embaixador, recalcula nível natural
  IF NOT _enabled THEN
    PERFORM public.recalc_photographer_level(_user_id);
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.set_ambassador(uuid, boolean) TO authenticated;

-- Função para garantir referral_code para um user
CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text; v_slug text;
BEGIN
  SELECT referral_code, slug INTO v_code, v_slug
  FROM public.photographer_sites WHERE user_id = _user_id;

  IF v_code IS NOT NULL AND length(v_code) > 0 THEN
    RETURN v_code;
  END IF;

  v_code := COALESCE(v_slug, substr(md5(_user_id::text || now()::text), 1, 8));

  -- Garante unicidade
  WHILE EXISTS (SELECT 1 FROM public.photographer_sites WHERE referral_code = v_code) LOOP
    v_code := v_code || substr(md5(random()::text), 1, 3);
  END LOOP;

  UPDATE public.photographer_sites SET referral_code = v_code WHERE user_id = _user_id;

  IF NOT FOUND THEN
    INSERT INTO public.photographer_sites (user_id, slug, referral_code, display_name)
    VALUES (_user_id, v_code, v_code, '')
    ON CONFLICT (user_id) DO UPDATE SET referral_code = EXCLUDED.referral_code;
  END IF;

  RETURN v_code;
END; $$;

GRANT EXECUTE ON FUNCTION public.ensure_referral_code(uuid) TO authenticated;
