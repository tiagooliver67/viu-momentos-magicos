-- Garantir privilégios para a API pública
GRANT SELECT ON public.photographer_sites TO anon, authenticated;
GRANT ALL ON public.photographer_sites TO service_role;

GRANT SELECT ON public.photographer_sites_public TO anon, authenticated;
GRANT ALL ON public.photographer_sites_public TO service_role;

-- Garantir privilégios para tabelas relacionadas consumidas na PhotographerPage
GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.custom_links TO anon, authenticated;
GRANT SELECT ON public.photographer_reputation TO anon, authenticated;
GRANT SELECT ON public.photographer_specialties TO anon, authenticated;
GRANT SELECT ON public.specialties TO anon, authenticated;

-- Corrigir política de RLS para leitura pública
DROP POLICY IF EXISTS "Public can view photographer sites" ON public.photographer_sites;
CREATE POLICY "Public can view photographer sites" ON public.photographer_sites
    FOR SELECT TO anon, authenticated
    USING (slug IS NOT NULL);
