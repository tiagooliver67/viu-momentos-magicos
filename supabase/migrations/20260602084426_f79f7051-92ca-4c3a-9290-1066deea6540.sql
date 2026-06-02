
-- ============================================================
-- Security hardening: PII exposure, cart, storage, photographer sites
-- ============================================================

-- 1) EVENT_REGISTRATIONS — remove public PII exposure
DROP POLICY IF EXISTS "Public can count registrations of published events" ON public.event_registrations;

-- Replace with a SECURITY DEFINER function that exposes ONLY non-PII fields
-- needed by the public registration form to compute availability.
CREATE OR REPLACE FUNCTION public.get_registration_availability(_event_id uuid)
RETURNS TABLE (category_id uuid, category text, shirt_size text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT er.category_id, er.category, er.shirt_size
  FROM public.event_registrations er
  JOIN public.registration_events re ON re.id = er.registration_event_id
  WHERE er.registration_event_id = _event_id
    AND re.status <> 'rascunho';
$$;

REVOKE EXECUTE ON FUNCTION public.get_registration_availability(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registration_availability(uuid) TO anon, authenticated;

-- 2) CART_ITEMS — drop permissive anonymous policies (cart lives in localStorage)
DROP POLICY IF EXISTS "Cart items by session" ON public.cart_items;
DROP POLICY IF EXISTS "Delete cart items by session" ON public.cart_items;
DROP POLICY IF EXISTS "Insert cart items" ON public.cart_items;
-- RLS remains enabled; with no policies, table is inaccessible to anon/authenticated.
-- service_role retains full access for any admin/backend operation.

-- 3) PHOTOGRAPHER_SITES — hide CNPJ, contact_email, contact_phone from public
DROP POLICY IF EXISTS "Public can view sites" ON public.photographer_sites;

-- Public sanitized view (SECURITY DEFINER semantics: bypasses RLS, exposes only safe columns)
CREATE OR REPLACE VIEW public.photographer_sites_public AS
SELECT
  id, user_id, slug, display_name, bio, avatar_url, banner_url, watermark_url,
  watermark_position, watermark_opacity, watermark_size,
  template, primary_color, secondary_color,
  whatsapp, instagram, facebook, tiktok, youtube, linkedin, twitter,
  seo_title, seo_keywords, allow_custom_links,
  created_at, updated_at
FROM public.photographer_sites;

GRANT SELECT ON public.photographer_sites_public TO anon, authenticated;

-- Owner policy ("Owner manages own site" ALL) already covers owner SELECT.
-- Super admin policy already exists.

-- 4) STORAGE: registration-assets — drop blanket public read & anon UPDATE
DROP POLICY IF EXISTS "Public read registration assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update registration proof" ON storage.objects;

-- Keep covers/ and regulations/ publicly readable (intentional public event assets).
CREATE POLICY "Public read registration covers and regulations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'registration-assets'
  AND (storage.foldername(name))[1] IN ('covers', 'regulations')
);
