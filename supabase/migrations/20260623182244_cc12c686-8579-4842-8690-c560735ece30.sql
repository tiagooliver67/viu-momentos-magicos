
CREATE OR REPLACE FUNCTION public.trg_referral_commission_on_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  v_ref record;
  v_pct numeric;
  v_share numeric;
  v_photog_count int;
BEGIN
  IF NEW.status NOT IN ('pago','paid','confirmed') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN RETURN NEW; END IF;

  -- Conta fotógrafos distintos no pedido para dividir o amount
  SELECT count(DISTINCT p.photographer_id) INTO v_photog_count
  FROM public.order_items oi
  JOIN public.event_photos p ON p.id = oi.photo_id
  WHERE oi.order_id = NEW.id AND p.photographer_id IS NOT NULL;

  IF v_photog_count = 0 THEN RETURN NEW; END IF;
  v_share := NEW.amount / v_photog_count;

  FOR r IN
    SELECT DISTINCT p.photographer_id AS uid
    FROM public.order_items oi
    JOIN public.event_photos p ON p.id = oi.photo_id
    WHERE oi.order_id = NEW.id AND p.photographer_id IS NOT NULL
  LOOP
    SELECT * INTO v_ref FROM public.referrals WHERE referred_id = r.uid LIMIT 1;
    IF v_ref IS NULL THEN CONTINUE; END IF;

    -- pct de comissão = nível do indicador
    SELECT lr.commission_pct INTO v_pct
    FROM public.photographer_levels pl
    JOIN public.level_rules lr ON lr.level = pl.current_level
    WHERE pl.user_id = v_ref.referrer_id;

    v_pct := COALESCE(v_pct, 0);
    IF v_pct <= 0 THEN CONTINUE; END IF;

    -- ativa a indicação
    UPDATE public.referrals SET status = 'active', activated_at = COALESCE(activated_at, now())
      WHERE id = v_ref.id AND status <> 'active';

    INSERT INTO public.referral_earnings (referrer_id, referred_id, order_id, amount, commission_pct)
    VALUES (v_ref.referrer_id, r.uid, NEW.id, ROUND((v_share * v_pct / 100)::numeric, 2), v_pct);

    PERFORM public.recalc_photographer_level(v_ref.referrer_id);
  END LOOP;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_referral_commission ON public.orders;
CREATE TRIGGER orders_referral_commission
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_referral_commission_on_paid();
