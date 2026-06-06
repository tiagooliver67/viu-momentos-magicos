
CREATE POLICY "Public read blog covers" ON storage.objects FOR SELECT USING (bucket_id = 'blog-covers');
CREATE POLICY "Super admin uploads blog covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-covers' AND public.is_super_admin());
CREATE POLICY "Super admin updates blog covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'blog-covers' AND public.is_super_admin());
CREATE POLICY "Super admin deletes blog covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'blog-covers' AND public.is_super_admin());
