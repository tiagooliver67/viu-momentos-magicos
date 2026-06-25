
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
  v_is_active boolean;
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

  SELECT (status::text = 'ativo'), created_at
    INTO v_is_active, v_created
    FROM public.events WHERE id = _event_id;

  IF v_is_active IS NULL THEN RETURN false; END IF;
  IF v_requires_published AND NOT COALESCE(v_is_active, false) THEN RETURN false; END IF;
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
