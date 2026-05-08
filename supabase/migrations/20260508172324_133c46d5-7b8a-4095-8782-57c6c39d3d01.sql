-- Tornar bucket de comprovantes privado
UPDATE storage.buckets SET public = false WHERE id = 'registration-assets';

-- Permitir upload anônimo apenas na pasta 'proofs/'
DROP POLICY IF EXISTS "Anyone can upload registration proof" ON storage.objects;
CREATE POLICY "Anyone can upload registration proof"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'registration-assets'
  AND (storage.foldername(name))[1] = 'proofs'
);

DROP POLICY IF EXISTS "Anyone can update registration proof" ON storage.objects;
CREATE POLICY "Anyone can update registration proof"
ON storage.objects FOR UPDATE
TO public
USING (
  bucket_id = 'registration-assets'
  AND (storage.foldername(name))[1] = 'proofs'
)
WITH CHECK (
  bucket_id = 'registration-assets'
  AND (storage.foldername(name))[1] = 'proofs'
);

-- Apenas o organizador do evento pode ler comprovantes (gerar URL assinada)
DROP POLICY IF EXISTS "Organizers can read registration proofs" ON storage.objects;
CREATE POLICY "Organizers can read registration proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'registration-assets'
  AND EXISTS (
    SELECT 1
    FROM public.event_registrations er
    JOIN public.registration_events re ON re.id = er.registration_event_id
    WHERE re.organizer_id = auth.uid()
      AND storage.objects.name LIKE 'proofs/' || er.id::text || '.%'
  )
);