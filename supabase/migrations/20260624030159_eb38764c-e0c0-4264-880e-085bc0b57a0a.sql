
DROP FUNCTION IF EXISTS public.recalc_photographer_level(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.recalc_photographer_level(_user_id uuid)
RETURNS text
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
  v_cat text;
  v_cat_sales int;
BEGIN
  SELECT count(*) INTO v_events
  FROM public.events e
  WHERE e.organizer_id = _user_id
     OR EXISTS (SELECT 1 FROM public.event_photographers ep WHERE ep.event_id = e.id AND ep.photographer_id = _user_id);

  SELECT count(*) INTO v_sales
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status = 'pago'
    AND EXISTS (SELECT 1 FROM public.event_photos p WHERE p.id = oi.photo_id AND p.photographer_id = _user_id);

  SELECT COALESCE(sum(o.amount),0) INTO v_revenue
  FROM public.orders o
  WHERE o.status = 'pago'
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.event_photos p ON p.id = oi.photo_id
      WHERE oi.order_id = o.id AND p.photographer_id = _user_id
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

  SELECT sort_order INTO v_current_order FROM public.level_rules WHERE level = v_current;

  v_new := 'bronze';
  v_new_order := 1;

  FOR r IN SELECT * FROM public.level_rules WHERE manual_only = false ORDER BY sort_order ASC LOOP
    IF r.match_mode = 'and' THEN
      v_match := (v_events >= r.min_events) AND (v_sales >= r.min_sales) AND (v_revenue >= r.min_revenue)
             AND (NOT r.requires_profile_complete OR v_profile_complete)
             AND (NOT r.requires_document OR v_has_document);
    ELSE
      v_match := (
        (r.min_events > 0 AND v_events >= r.min_events)
        OR (r.min_sales > 0 AND v_sales >= r.min_sales)
        OR (r.min_revenue > 0 AND v_revenue >= r.min_revenue)
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

  SELECT COALESCE(sort_order, 0) INTO v_current_order FROM public.level_rules WHERE level = v_current;
  IF v_new_order < v_current_order AND NOT v_is_ambassador THEN
    v_new := v_current;
    v_new_order := v_current_order;
  END IF;

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
      WHERE o.status = 'pago' AND p.photographer_id = _user_id AND lower(e.category) = lower(v_cat);
      IF v_cat_sales >= v_val THEN v_match := true; END IF;
    END IF;

    IF v_match THEN
      INSERT INTO public.photographer_achievements (user_id, achievement_id)
      VALUES (_user_id, v_ach.id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalc_photographer_level(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_recalc_on_order_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.status = 'pago' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
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
    SELECT referrer_id INTO v_referrer FROM public.referrals WHERE referred_id = r.uid AND status = 'active' LIMIT 1;
    IF v_referrer IS NULL THEN CONTINUE; END IF;

    SELECT current_level INTO v_level FROM public.photographer_levels WHERE user_id = v_referrer;
    SELECT commission_pct INTO v_pct FROM public.level_rules WHERE level = COALESCE(v_level,'bronze');

    IF v_pct IS NULL OR v_pct = 0 THEN CONTINUE; END IF;

    INSERT INTO public.referral_earnings (referrer_id, referred_id, order_id, amount, commission_pct, commission_amount, status)
    VALUES (v_referrer, r.uid, NEW.id, NEW.amount, v_pct, ROUND(NEW.amount * v_pct / 100.0, 2), 'pending')
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_referral_credit ON public.orders;
CREATE TRIGGER orders_referral_credit
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_referral_credit_on_order();
