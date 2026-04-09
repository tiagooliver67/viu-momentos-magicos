-- Create a helper function to check super_admin without RLS recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  )
$$;

-- Profiles
CREATE POLICY "Super admin can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admin can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_super_admin());

-- User roles
CREATE POLICY "Super admin can read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admin can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admin can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admin can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_super_admin());

-- Events
CREATE POLICY "Super admin can read all events"
ON public.events FOR SELECT TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admin can update all events"
ON public.events FOR UPDATE TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super admin can delete all events"
ON public.events FOR DELETE TO authenticated
USING (public.is_super_admin());

-- Orders
CREATE POLICY "Super admin can read all orders"
ON public.orders FOR SELECT TO authenticated
USING (public.is_super_admin());

-- Event photos
CREATE POLICY "Super admin can read all photos"
ON public.event_photos FOR SELECT TO authenticated
USING (public.is_super_admin());

-- Event videos
CREATE POLICY "Super admin can read all videos"
ON public.event_videos FOR SELECT TO authenticated
USING (public.is_super_admin());

-- Event photographers
CREATE POLICY "Super admin can read all event_photographers"
ON public.event_photographers FOR SELECT TO authenticated
USING (public.is_super_admin());

-- Photographer sites
CREATE POLICY "Super admin can read all photographer_sites"
ON public.photographer_sites FOR SELECT TO authenticated
USING (public.is_super_admin());

-- Order items
CREATE POLICY "Super admin can read all order_items"
ON public.order_items FOR SELECT TO authenticated
USING (public.is_super_admin());