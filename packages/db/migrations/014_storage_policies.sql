-- Migration 014: Supabase Storage policies for vendor media buckets
-- Buckets (created in Supabase dashboard): portfolio, banners, pfp
-- Object path pattern: {vendor_id}/{filename}

BEGIN;

-- portfolio
CREATE POLICY storage_portfolio_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'portfolio');

CREATE POLICY storage_portfolio_vendor_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY storage_portfolio_vendor_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY storage_portfolio_vendor_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()::text
    )
  );

-- banners
CREATE POLICY storage_banners_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'banners');

CREATE POLICY storage_banners_vendor_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'banners'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY storage_banners_vendor_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'banners'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY storage_banners_vendor_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'banners'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()::text
    )
  );

-- pfp
CREATE POLICY storage_pfp_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pfp');

CREATE POLICY storage_pfp_vendor_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pfp'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY storage_pfp_vendor_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'pfp'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()::text
    )
  );

CREATE POLICY storage_pfp_vendor_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'pfp'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.vendors WHERE user_id = auth.uid()::text
    )
  );

COMMIT;
