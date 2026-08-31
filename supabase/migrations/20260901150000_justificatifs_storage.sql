-- ============================================================
-- Justificatifs d'absence (pièces jointes) — stockage Supabase
--  · bucket public « justificatifs-eleves » (images + PDF, 10 Mo)
--  · upload autorisé : anon (portail parent) + authenticated (admin)
--  · lecture publique (le parent consulte sa propre demande)
--  · colonnes justificatif_url / justificatif_nom sur permissions_eleves
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('justificatifs-eleves', 'justificatifs-eleves', true, 10485760,
        ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Upload anonyme (portail parent) : le dossier de stockage contient
-- ecole_id/eleve_id/... pour éviter les collisions
DROP POLICY IF EXISTS "justificatifs_insert_anon" ON storage.objects;
CREATE POLICY "justificatifs_insert_anon" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'justificatifs-eleves');

DROP POLICY IF EXISTS "justificatifs_insert_auth" ON storage.objects;
CREATE POLICY "justificatifs_insert_auth" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'justificatifs-eleves');

-- Lecture publique
DROP POLICY IF EXISTS "justificatifs_select_public" ON storage.objects;
CREATE POLICY "justificatifs_select_public" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'justificatifs-eleves');

-- Colonnes justificatif sur les permissions
ALTER TABLE public.permissions_eleves ADD COLUMN IF NOT EXISTS justificatif_url text;
ALTER TABLE public.permissions_eleves ADD COLUMN IF NOT EXISTS justificatif_nom text;
