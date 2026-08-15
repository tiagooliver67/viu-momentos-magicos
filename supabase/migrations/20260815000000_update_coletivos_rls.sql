-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Coletivo members can view collective" ON public.coletivos;
DROP POLICY IF EXISTS "Collective owners can manage their collective" ON public.coletivos;

-- Policy: Users can view a collective if they are the owner OR an active member
CREATE POLICY "Users can view collective if owner or member"
ON public.coletivos
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.coletivo_members
    WHERE coletivo_id = public.coletivos.id
    AND user_id = auth.uid()
    AND status = 'ativo'
  )
);

-- Policy: Collective owners can manage (update/delete) their collective
CREATE POLICY "Collective owners can manage collective"
ON public.coletivos
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coletivos TO authenticated;
GRANT ALL ON public.coletivos TO service_role;
