-- 1. Criar tabela de Especialidades
CREATE TABLE public.specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    icon TEXT NOT NULL,
    min_events INTEGER NOT NULL DEFAULT 5,
    min_photos_sold INTEGER NOT NULL DEFAULT 200,
    min_unique_clients INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.specialties TO authenticated;
GRANT ALL ON public.specialties TO service_role;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read specialties" ON public.specialties FOR SELECT TO authenticated USING (true);

-- 2. Criar tabela de progresso de especialidades do fotógrafo
CREATE TABLE public.photographer_specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    specialty_id UUID REFERENCES public.specialties(id) ON DELETE CASCADE NOT NULL,
    events_count INTEGER DEFAULT 0,
    photos_sold_count INTEGER DEFAULT 0,
    unique_clients_count INTEGER DEFAULT 0,
    unlocked_at TIMESTAMPTZ,
    level TEXT DEFAULT 'Especialista',
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, specialty_id)
);

GRANT SELECT ON public.photographer_specialties TO authenticated;
GRANT ALL ON public.photographer_specialties TO service_role;
ALTER TABLE public.photographer_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own specialties" ON public.photographer_specialties FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. Inserir especialidades iniciais
INSERT INTO public.specialties (code, title, icon, min_events, min_photos_sold) VALUES
('corridas', 'Corridas', '🏃', 5, 200),
('futebol', 'Futebol', '⚽', 5, 300),
('ciclismo', 'Ciclismo', '🚴', 3, 150),
('volei', 'Vôlei', '🏐', 3, 100),
('basquete', 'Basquete', '🏀', 3, 100),
('natacao', 'Natação', '🏊', 3, 100),
('motocross', 'Motocross', '🏍️', 5, 150),
('vaquejada', 'Vaquejada', '🐎', 5, 150),
('tenis', 'Tênis', '🎾', 3, 100),
('casamentos', 'Casamentos', '💍', 20, 0),
('rodeio', 'Rodeio', '🤠', 5, 150);

-- 4. Criar tabela de Reputação
CREATE TABLE public.photographer_reputation (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    rating_avg NUMERIC(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    response_rate INTEGER DEFAULT 100,
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT ON public.photographer_reputation TO authenticated;
GRANT ALL ON public.photographer_reputation TO service_role;
ALTER TABLE public.photographer_reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see reputation" ON public.photographer_reputation FOR SELECT TO authenticated USING (true);

-- 5. Atualizar benefícios (jsonb handling)
UPDATE public.level_rules 
SET benefits = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(benefits) AS elem
  WHERE elem ->> 0 != 'Comissão de indicação 1%'
),
commission_pct = 0
WHERE level IN ('bronze', 'prata', 'ouro', 'diamante');
