
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

  v_client_key := md5(coalesce(lower(NEW.client_email),'') || '|' || coalesce(NEW.client_cpf,''));
  IF v_client_key IS NULL OR v_client_key = md5('|') THEN
    v_client_key := 'order:' || NEW.id::text;
  END IF;

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
      (r.event_id, r.photographer_id, v_client_key, NULL, NEW.id)
    ON CONFLICT (event_id, photographer_id, client_key) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;
