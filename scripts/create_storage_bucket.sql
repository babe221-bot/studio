-- ============================================================
-- Sprint 2: Create the 'drawings' Supabase Storage bucket
-- Run in Supabase SQL Editor (once, idempotent).
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('drawings', 'drawings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated uploads and public reads via RLS policy
-- (Only needed if RLS is enabled on storage.objects)
CREATE POLICY "Allow public read on drawings" ON storage.objects
  FOR SELECT USING (bucket_id = 'drawings');

CREATE POLICY "Allow authenticated upload to drawings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'drawings'
    AND auth.role() = 'authenticated'
  );

-- Service-role uploads bypass RLS automatically, so no extra policy needed
-- for server-side operations using SUPABASE_SERVICE_ROLE_KEY.
