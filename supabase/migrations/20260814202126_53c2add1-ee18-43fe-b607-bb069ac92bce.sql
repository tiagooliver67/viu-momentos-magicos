
-- Migration para Coletivos
CREATE TABLE public.coletivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_asaas_wallet_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coletivos TO authenticated;
GRANT ALL ON public.coletivos TO service_role;
GRANT SELECT ON public.coletivos TO anon;

ALTER TABLE public.coletivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own coletivo" ON public.coletivos FOR ALL
  TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Public reads basic coletivo info" ON public.coletivos FOR SELECT 
  TO public
  USING (true);

CREATE TYPE public.coletivo_member_status AS ENUM ('convidado', 'ativo', 'removido');

CREATE TABLE public.coletivo_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coletivo_id UUID NOT NULL REFERENCES public.coletivos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.coletivo_member_status NOT NULL DEFAULT 'convidado',
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE (coletivo_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coletivo_members TO authenticated;
GRANT ALL ON public.coletivo_members TO service_role;

ALTER TABLE public.coletivo_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages members" ON public.coletivo_members FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.coletivos c WHERE c.id = coletivo_id AND c.owner_id = auth.uid()));

CREATE POLICY "Member sees and updates own membership" ON public.coletivo_members FOR ALL
  TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Alterar events
ALTER TABLE public.events
  ADD COLUMN coletivo_id UUID REFERENCES public.coletivos(id) ON DELETE SET NULL,
  ADD COLUMN coletivo_priority_until TIMESTAMPTZ;

-- Garantir que asaas_wallet_id existe no profile
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'asaas_wallet_id') THEN
        ALTER TABLE public.profiles ADD COLUMN asaas_wallet_id TEXT;
    END IF;
END $$;
