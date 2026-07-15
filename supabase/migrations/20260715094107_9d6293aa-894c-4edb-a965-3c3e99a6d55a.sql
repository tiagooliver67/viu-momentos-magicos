CREATE POLICY "Public can read price grids"
ON public.price_grids
FOR SELECT
TO anon, authenticated
USING (true);

GRANT SELECT ON public.price_grids TO anon;
GRANT SELECT ON public.price_grids TO authenticated;