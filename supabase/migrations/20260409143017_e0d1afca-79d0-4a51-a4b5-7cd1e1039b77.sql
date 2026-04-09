
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('user', 'photographer', 'organizer');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check roles (avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. RLS policies
CREATE POLICY "Anyone can view roles"
ON public.user_roles
FOR SELECT
USING (true);

CREATE POLICY "Users can add roles to themselves"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 6. Trigger to auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  -- Also add photographer role if interest indicates it
  IF NEW.raw_user_meta_data->>'interest' IN ('fotografo', 'ambos') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'photographer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  -- Also add organizer role if interest indicates it
  IF NEW.raw_user_meta_data->>'interest' IN ('organizador', 'ambos') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'organizer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();

-- 7. Migrate existing users: give everyone 'user' role
-- and 'photographer' to those with interest = 'fotografo'
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'user'::app_role
FROM public.profiles p
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'photographer'::app_role
FROM public.profiles p
WHERE p.interest IN ('fotografo', 'ambos')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'organizer'::app_role
FROM public.profiles p
WHERE p.interest IN ('organizador', 'ambos')
ON CONFLICT (user_id, role) DO NOTHING;
