-- 1. Tabela de Configurações Globais do Programa Embaixador
CREATE TABLE public.ambassador_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_commission_pct NUMERIC NOT NULL DEFAULT 1.0, -- 1%
    default_duration_months INTEGER NOT NULL DEFAULT 12, -- 12 meses
    min_payout_amount NUMERIC NOT NULL DEFAULT 50.0, -- Valor mínimo para saque
    payout_cooldown_days INTEGER NOT NULL DEFAULT 30, -- Prazo de liberação/ciclo
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Inserir configuração inicial
INSERT INTO public.ambassador_settings (default_commission_pct, default_duration_months)
VALUES (1.0, 12);

GRANT SELECT ON public.ambassador_settings TO authenticated;
GRANT ALL ON public.ambassador_settings TO service_role;
ALTER TABLE public.ambassador_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ambassador settings" 
ON public.ambassador_settings FOR ALL 
TO authenticated 
USING (public.is_super_admin());

CREATE POLICY "Authenticated users can read ambassador settings" 
ON public.ambassador_settings FOR SELECT 
TO authenticated 
USING (true);

-- 2. Evoluir a tabela public.referrals para suportar vigência e comissão customizada
ALTER TABLE public.referrals 
ADD COLUMN commission_pct NUMERIC, -- NULL significa usar o padrão global no momento da criação ou atual
ADD COLUMN starts_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN expires_at TIMESTAMPTZ,
ADD COLUMN is_paused BOOLEAN DEFAULT false,
ADD COLUMN notes TEXT;

-- Atualizar registros existentes com a regra padrão de 12 meses
UPDATE public.referrals 
SET expires_at = created_at + interval '12 months'
WHERE expires_at IS NULL;

-- 3. Tabela de Auditoria (Logs de alteração)
CREATE TABLE public.ambassador_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID REFERENCES public.referrals(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'create', 'update_expiry', 'add_months', 'renew', 'pause', 'resume', 'stop', 'infinite'
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.ambassador_audit_logs TO authenticated;
GRANT ALL ON public.ambassador_audit_logs TO service_role;
ALTER TABLE public.ambassador_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can see audit logs" 
ON public.ambassador_audit_logs FOR SELECT 
TO authenticated 
USING (public.is_super_admin());

-- 4. Função para verificar se uma indicação está ativa e qual sua comissão atual
CREATE OR REPLACE FUNCTION public.get_referral_active_commission(_referral_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_rec RECORD;
    v_default NUMERIC;
BEGIN
    SELECT * INTO v_rec FROM public.referrals WHERE id = _referral_id;
    
    -- Se pausado ou expirado, comissão 0
    IF v_rec.is_paused OR (v_rec.expires_at IS NOT NULL AND v_rec.expires_at < now()) THEN
        RETURN 0;
    END IF;

    -- Se tiver comissão customizada na linha, usa ela
    IF v_rec.commission_pct IS NOT NULL THEN
        RETURN v_rec.commission_pct;
    END IF;

    -- Caso contrário, busca o padrão global
    SELECT default_commission_pct INTO v_default FROM public.ambassador_settings LIMIT 1;
    RETURN COALESCE(v_default, 1.0);
END;
$$;
