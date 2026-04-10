
-- Add blocked status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;

-- Add last sign in tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_sign_in_at timestamp with time zone;

-- Create admin audit log table
CREATE TABLE public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  target_user_id uuid NOT NULL,
  details jsonb DEFAULT '{}',
  performed_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can read audit logs"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "Super admin can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

-- Index for quick lookups
CREATE INDEX idx_audit_log_target ON public.admin_audit_log(target_user_id);
CREATE INDEX idx_audit_log_created ON public.admin_audit_log(created_at DESC);

-- Update last_sign_in_at via a function that can be called after login
CREATE OR REPLACE FUNCTION public.update_last_sign_in()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_sign_in_at = now()
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;
