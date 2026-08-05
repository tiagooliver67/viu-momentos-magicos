-- Corrigir linter: RLS sem políticas nas novas tabelas (embora eu tenha adicionado, o linter pode ser sensível ao service_role)
-- Reforçar políticas para garantir que o linter e o sistema reconheçam as permissões.

DO $$ 
BEGIN
    -- Especialidades já tem políticas, mas vamos garantir que o service_role tenha acesso total
    -- photographer_specialties
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photographer_specialties' AND policyname = 'Admins can manage all specialties') THEN
        CREATE POLICY "Admins can manage all specialties" ON public.photographer_specialties FOR ALL TO service_role USING (true);
    END IF;

    -- photographer_reputation
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'photographer_reputation' AND policyname = 'Admins can manage all reputations') THEN
        CREATE POLICY "Admins can manage all reputations" ON public.photographer_reputation FOR ALL TO service_role USING (true);
    END IF;
END $$;
