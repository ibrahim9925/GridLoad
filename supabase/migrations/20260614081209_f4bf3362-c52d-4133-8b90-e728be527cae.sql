
CREATE POLICY "Public read product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Auth write product-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "Auth update product-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images');
CREATE POLICY "Auth delete product-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images');

CREATE POLICY "Public read datasheets" ON storage.objects FOR SELECT USING (bucket_id = 'datasheets');
CREATE POLICY "Auth write datasheets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'datasheets');
CREATE POLICY "Auth update datasheets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'datasheets');
CREATE POLICY "Auth delete datasheets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'datasheets');
