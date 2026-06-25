
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
  SELECT count(*) INTO v_events
  FROM public.events e
  WHERE e.organizer_id = _user_id
     OR EXISTS (SELECT 1 FROM public.event_photographers ep WHERE ep.event_id = e.id AND ep.photographer_id = _user_id);

  SELECT count(*) INTO v_eligible_events
  FROM public.events e
  WHERE (e.organizer_id = _user_id
         OR EXISTS (SELECT 1 FROM public.event_photographers ep WHERE ep.event_id = e.id AND ep.photographer_id = _user_id))
    AND public.is_event_eligible(e.id);

  SELECT count(*) INTO v_sales
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status = 'pago'
    AND EXISTS (SELECT 1 FROM public.event_photos p WHERE p.id = oi.photo_id AND p.photographer_id = _user_id);

  SELECT count(*) INTO v_attended
  FROM public.event_participations
  WHERE photographer_id = _user_id;

  SELECT COALESCE(sum(o.amount),0) INTO v_revenue
  FROM public.orders o
  WHERE o.status = 'pago'
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.event_photos p ON p.id = oi.photo_id
      WHERE oi.order_id = o.id AND p.photographer_id = _user_id
    );

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

  SELECT current_level::text, is_ambassador INTO v_current, v_is_ambassador
  FROM public.photographer_levels WHERE user_id = _user_id;

  v_current := COALESCE(v_current, 'bronze');
  v_is_ambassador := COALESCE(v_is_ambassador, false);

  v_new := 'bronze';
  v_new_order := 1;

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
      v_new := r.level::text;
      v_new_order := r.sort_order;
    END IF;
  END LOOP;

  IF v_is_ambassador THEN
    v_new := 'embaixador';
    SELECT sort_order INTO v_new_order FROM public.level_rules WHERE level::text = 'embaixador';
  END IF;

  SELECT COALESCE(sort_order, 0) INTO v_current_order FROM public.level_rules WHERE level::text = v_current;
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
