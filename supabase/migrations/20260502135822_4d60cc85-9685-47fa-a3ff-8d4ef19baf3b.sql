-- ==========================================
-- 1. PROFILES: View pública + RLS restritivo
-- ==========================================
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT id, user_id, full_name, avatar_url
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Organizadores precisam ver perfis de fotógrafos vinculados aos seus eventos
CREATE POLICY "Admins can view all profiles via policy"
ON public.profiles FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "Organizers can view photographer profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.event_photographers ep
    JOIN public.events e ON e.id = ep.event_id
    WHERE ep.photographer_id = profiles.user_id
      AND e.organizer_id = auth.uid()
  )
);

-- ==========================================
-- 2. USER_ROLES: bloquear escalada de privilégios
-- ==========================================
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can add roles to themselves" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ==========================================
-- 3. ORDERS: restringir SELECT e UPDATE
-- ==========================================
DROP POLICY IF EXISTS "Public can read orders by email" ON public.orders;
DROP POLICY IF EXISTS "Service can update orders" ON public.orders;

CREATE POLICY "Clients view own orders"
ON public.orders FOR SELECT
USING (
  (auth.jwt() ->> 'email') = client_email
  OR is_super_admin()
  OR is_event_organizer(event_id)
);

CREATE POLICY "Admins and organizers update orders"
ON public.orders FOR UPDATE
USING (is_super_admin() OR is_event_organizer(event_id));
-- Webhooks usam service_role e ignoram RLS.

-- ==========================================
-- 4. ORDER_ITEMS: restringir SELECT
-- ==========================================
DROP POLICY IF EXISTS "Public can read order items" ON public.order_items;

CREATE POLICY "Users view items from own orders"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (auth.jwt() ->> 'email') = o.client_email
        OR is_super_admin()
        OR is_event_organizer(o.event_id)
      )
  )
);

-- ==========================================
-- 5. STORAGE: proteger DELETE em event-photos/videos
-- ==========================================
DROP POLICY IF EXISTS "Authenticated users can delete event-photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event-videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
DROP POLICY IF EXISTS "Only owners or organizers can delete event media" ON storage.objects;

CREATE POLICY "Only owners or admins can delete event media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('event-photos', 'event-videos')
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR is_super_admin()
  )
);