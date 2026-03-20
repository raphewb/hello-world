-- SwissTrust Dossier — Supabase Row Level Security Policies
-- Run these in the Supabase SQL editor after running migrations

-- ─── Storage Buckets ─────────────────────────────────────────────────────────

-- Create buckets (run in Supabase dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false);

-- ─── Documents bucket RLS ─────────────────────────────────────────────────────

-- Tenants can upload their own documents
CREATE POLICY "Tenants upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Tenants can read their own documents
CREATE POLICY "Tenants read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Tenants can delete their own documents
CREATE POLICY "Tenants delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Service role can access all documents (for AI verification, signed URLs)
-- Service role bypasses RLS by default in Supabase

-- ─── QR Codes bucket RLS ──────────────────────────────────────────────────────

CREATE POLICY "Authenticated users read QR codes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'qr-codes');

CREATE POLICY "Service role upload QR codes"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'qr-codes');

-- ─── PDFs bucket RLS ──────────────────────────────────────────────────────────

CREATE POLICY "Authenticated users read PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs');

CREATE POLICY "Service role upload PDFs"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'pdfs');

-- ─── Database RLS notes ───────────────────────────────────────────────────────
-- Prisma uses the service role key for all DB operations via the API routes.
-- The API routes enforce all access control in application code.
-- RLS on Prisma-managed tables is optional but can be added for defense-in-depth.
-- Key enforcement points in application code:
--   1. /api/tenant/* — verify auth user owns the tenant profile
--   2. /api/certificate/[id] — check sharing mode + viewer identity before returning data
--   3. /api/agent/applications/[certId] — verify agent belongs to directed/OPEN cert regie
--   4. Document signed URLs — generated server-side only, 15min expiry
