-- =========================================================
-- 1) SECURITY DEFINER VIEW -> security invoker + column grants
-- =========================================================
ALTER VIEW public.photographer_sites_public SET (security_invoker = on);

CREATE POLICY "Public can view photographer sites"
ON public.photographer_sites
FOR SELECT
TO anon, authenticated
USING (slug IS NOT NULL);

REVOKE SELECT ON public.photographer_sites FROM anon, authenticated;

GRANT SELECT (
  id, user_id, slug, display_name, bio, avatar_url, banner_url, watermark_url,
  watermark_position, watermark_opacity, watermark_size, template,
  primary_color, secondary_color, whatsapp, instagram, facebook, tiktok,
  youtube, linkedin, twitter, seo_title, seo_keywords, allow_custom_links,
  ai_bio, ai_bio_generated_at, created_at, updated_at,
  blur_protection_enabled, blur_protection_pattern, blur_protection_devices
) ON public.photographer_sites TO anon;

GRANT SELECT (
  id, user_id, slug, display_name, bio, avatar_url, banner_url, watermark_url,
  watermark_position, watermark_opacity, watermark_size, template,
  primary_color, secondary_color, whatsapp, instagram, facebook, tiktok,
  youtube, linkedin, twitter, seo_title, seo_keywords, allow_custom_links,
  ai_bio, ai_bio_generated_at, created_at, updated_at,
  blur_protection_enabled, blur_protection_pattern, blur_protection_devices,
  contact_email, contact_phone
) ON public.photographer_sites TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photographer_sites TO service_role;

-- =========================================================
-- 2) Revoke EXECUTE on privileged SECURITY DEFINER functions
--    (trigger functions + admin/maintenance routines)
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.auto_activate_withdrawal_account() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_full_name_cooldown() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_partner_limit() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_event_progress_total() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_face_progress() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_fraud_check_order() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_fraud_check_participation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_fraud_check_referral() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_on_event() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_recalc_on_order_paid() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_referral_commission_on_paid() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_referral_credit_on_order() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_register_participation_on_paid() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_last_sign_in() FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_scheduled_events() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_due_referral_earnings() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_photo_search_index() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.infra_metrics_snapshot() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fraud_register_signal(text, uuid, uuid, text, jsonb, text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_event_eligible(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_partner_active(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_partner_approved(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_blog_views(text) FROM PUBLIC;

-- anon should not be able to call these authenticated-only routines
REVOKE EXECUTE ON FUNCTION public.ensure_referral_code(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalc_photographer_level(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_ambassador(uuid, boolean) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fraud_decide_case(uuid, text, text) FROM anon, PUBLIC;

-- =========================================================
-- 3) Harden storage policies: event media
-- =========================================================
DROP POLICY IF EXISTS "Auth users upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth users update covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users delete videos" ON storage.objects;

CREATE POLICY "Owners upload event media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = ANY (ARRAY['event-photos','event-videos'])
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_event_organizer(NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.is_event_photographer(NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.is_super_admin()
  )
);

CREATE POLICY "Owners delete event media files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = ANY (ARRAY['event-photos','event-videos'])
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_event_organizer(NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.is_super_admin()
  )
);

CREATE POLICY "Organizers upload event covers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-covers'
  AND (
    public.is_event_organizer(NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.is_super_admin()
  )
);

CREATE POLICY "Organizers update event covers"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'event-covers'
  AND (
    public.is_event_organizer(NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.is_super_admin()
  )
)
WITH CHECK (
  bucket_id = 'event-covers'
  AND (
    public.is_event_organizer(NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.is_super_admin()
  )
);

CREATE POLICY "Organizers delete event covers"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-covers'
  AND (
    public.is_event_organizer(NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.is_super_admin()
  )
);

-- =========================================================
-- 4) Harden storage policies: registration assets
-- =========================================================
DROP POLICY IF EXISTS "Anyone can upload registration assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload registration proof" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update own registration assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete own registration assets" ON storage.objects;

CREATE POLICY "Organizers upload own registration assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'registration-assets'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

CREATE POLICY "Owners update own registration assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'registration-assets'
  AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_super_admin())
)
WITH CHECK (
  bucket_id = 'registration-assets'
  AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_super_admin())
);

CREATE POLICY "Owners delete own registration assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'registration-assets'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_super_admin()
    OR (
      (storage.foldername(name))[1] = 'proofs'
      AND EXISTS (
        SELECT 1 FROM public.event_registrations er
        JOIN public.registration_events re ON re.id = er.registration_event_id
        WHERE re.organizer_id = auth.uid()
          AND objects.name LIKE ('proofs/' || er.id::text || '.%')
      )
    )
  )
);

-- Comprovantes: só para inscrição existente e ainda pendente de pagamento
CREATE POLICY "Upload proof for pending registration"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'registration-assets'
  AND (storage.foldername(name))[1] = 'proofs'
  AND EXISTS (
    SELECT 1 FROM public.event_registrations er
    WHERE er.payment_status = 'pendente'::public.registration_payment_status
      AND objects.name LIKE ('proofs/' || er.id::text || '.%')
  )
);

-- =========================================================
-- 5) Public buckets: block listing (public URLs keep working)
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view covers" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read photographer assets" ON storage.objects;

CREATE POLICY "Owners list own photographer assets"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'photographer-assets'
  AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_super_admin())
);

CREATE POLICY "Organizers list own event media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = ANY (ARRAY['event-photos','event-videos','event-covers'])
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_event_organizer(NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.is_event_photographer(NULLIF((storage.foldername(name))[1], '')::uuid)
    OR public.is_super_admin()
  )
);

-- =========================================================
-- 6) Remove always-true INSERT policies
-- =========================================================
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can create pending orders"
ON public.orders FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'aguardando_pagamento'::public.order_status
  AND asaas_payment_id IS NULL
  AND amount >= 0
  AND length(client_name) BETWEEN 1 AND 200
  AND length(client_email) BETWEEN 3 AND 200
  AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id)
);

DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
CREATE POLICY "Items only on own pending order"
ON public.order_items FOR INSERT TO anon, authenticated
WITH CHECK (
  price >= 0
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND o.status = 'aguardando_pagamento'::public.order_status
      AND o.created_at > now() - interval '2 hours'
  )
);

DROP POLICY IF EXISTS "Public can insert registrations" ON public.event_registrations;
CREATE POLICY "Public can register on open events"
ON public.event_registrations FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND payment_status = 'pendente'::public.registration_payment_status
  AND checkin_status = 'ausente'::public.registration_checkin_status
  AND EXISTS (
    SELECT 1 FROM public.registration_events re
    WHERE re.id = registration_event_id
      AND re.status = 'aberto'::public.registration_event_status
  )
);

DROP POLICY IF EXISTS "anyone can log marketing events" ON public.marketing_events_log;
CREATE POLICY "Anyone can log marketing events"
ON public.marketing_events_log FOR INSERT TO anon, authenticated
WITH CHECK (
  length(event_name) BETWEEN 1 AND 120
  AND (photographer_id IS NULL OR EXISTS (SELECT 1 FROM public.photographer_sites ps WHERE ps.user_id = photographer_id))
);