-- 1. Flag pública (não revela a senha)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS has_password boolean NOT NULL DEFAULT false;

-- 2. Tabela de senhas (somente servidor)
CREATE TABLE IF NOT EXISTS public.event_passwords (
  event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.event_passwords TO service_role;
ALTER TABLE public.event_passwords ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: acesso apenas via service_role (edge function)

CREATE TRIGGER event_passwords_updated_at
BEFORE UPDATE ON public.event_passwords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tabela de liberação de acesso (somente servidor)
CREATE TABLE IF NOT EXISTS public.event_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  session_id text,
  ip_address text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_access_event_idx ON public.event_access(event_id);
GRANT ALL ON public.event_access TO service_role;
ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: acesso apenas via service_role (edge function)

-- 4. Migração das senhas existentes (texto puro -> hash bcrypt)
INSERT INTO public.event_passwords (event_id, password_hash)
SELECT id, extensions.crypt(password, extensions.gen_salt('bf'))
FROM public.events
WHERE password IS NOT NULL AND length(trim(password)) > 0
ON CONFLICT (event_id) DO NOTHING;

UPDATE public.events e
SET has_password = true
WHERE EXISTS (SELECT 1 FROM public.event_passwords p WHERE p.event_id = e.id);

-- 5. Remove a coluna em texto puro
ALTER TABLE public.events DROP COLUMN IF EXISTS password;

-- 6. Fotos/vídeos de eventos protegidos deixam de ser públicos
DROP POLICY IF EXISTS "Photos readable" ON public.event_photos;
CREATE POLICY "Photos readable" ON public.event_photos
FOR SELECT USING (
  public.is_event_organizer(event_id)
  OR public.is_event_photographer(event_id)
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_photos.event_id
      AND e.visibility = true
      AND e.has_password = false
  )
);

DROP POLICY IF EXISTS "Videos readable" ON public.event_videos;
CREATE POLICY "Videos readable" ON public.event_videos
FOR SELECT USING (
  public.is_event_organizer(event_id)
  OR public.is_event_photographer(event_id)
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_videos.event_id
      AND e.visibility = true
      AND e.has_password = false
  )
);