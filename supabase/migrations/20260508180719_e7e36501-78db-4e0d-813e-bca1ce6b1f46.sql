
-- Permitir UPDATE/DELETE de event_registrations pelo super admin
CREATE POLICY "Super admin can update registrations"
ON public.event_registrations
FOR UPDATE
TO authenticated
USING (is_super_admin());

CREATE POLICY "Super admin can delete registrations"
ON public.event_registrations
FOR DELETE
TO authenticated
USING (is_super_admin());
