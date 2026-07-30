CREATE OR REPLACE FUNCTION public.hash_event_password(_password text)
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT extensions.crypt(_password, extensions.gen_salt('bf'));
$$;

REVOKE ALL ON FUNCTION public.hash_event_password(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_event_password(text) TO service_role;

CREATE OR REPLACE FUNCTION public.verify_event_password(_event_id uuid, _password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_passwords
    WHERE event_id = _event_id
      AND password_hash = extensions.crypt(_password, password_hash)
  );
$$;

REVOKE ALL ON FUNCTION public.verify_event_password(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_event_password(uuid, text) TO service_role;