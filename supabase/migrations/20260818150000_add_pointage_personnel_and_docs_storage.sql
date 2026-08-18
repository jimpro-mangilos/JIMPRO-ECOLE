-- ============================================================
-- Personnel : pièces jointes (documents), photo, pointage/présence
-- ============================================================

-- Photo du personnel (pour la carte de service)
ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Bucket de stockage des documents du personnel
INSERT INTO storage.buckets (id, name, public)
VALUES ('personnel-docs', 'personnel-docs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "personnel_docs_select" ON storage.objects;
CREATE POLICY "personnel_docs_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'personnel-docs');

DROP POLICY IF EXISTS "personnel_docs_insert" ON storage.objects;
CREATE POLICY "personnel_docs_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'personnel-docs');

DROP POLICY IF EXISTS "personnel_docs_update" ON storage.objects;
CREATE POLICY "personnel_docs_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'personnel-docs');

DROP POLICY IF EXISTS "personnel_docs_delete" ON storage.objects;
CREATE POLICY "personnel_docs_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'personnel-docs');

-- Table de pointage / présence du personnel
CREATE TABLE IF NOT EXISTS public.pointages_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  date_pointage date NOT NULL DEFAULT CURRENT_DATE,
  heure_arrivee time,
  heure_depart time,
  statut text NOT NULL DEFAULT 'present',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (personnel_id, date_pointage)
);

CREATE INDEX IF NOT EXISTS idx_pointages_personnel_ecole ON public.pointages_personnel (ecole_id);
CREATE INDEX IF NOT EXISTS idx_pointages_personnel_date ON public.pointages_personnel (date_pointage);

ALTER TABLE public.pointages_personnel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pointages_personnel_select" ON public.pointages_personnel;
CREATE POLICY "pointages_personnel_select" ON public.pointages_personnel FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "pointages_personnel_insert" ON public.pointages_personnel;
CREATE POLICY "pointages_personnel_insert" ON public.pointages_personnel FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "pointages_personnel_update" ON public.pointages_personnel;
CREATE POLICY "pointages_personnel_update" ON public.pointages_personnel FOR UPDATE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "pointages_personnel_delete" ON public.pointages_personnel;
CREATE POLICY "pointages_personnel_delete" ON public.pointages_personnel FOR DELETE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- Menu : entrée "pointage" pour tous les rôles
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.roles LOOP
    INSERT INTO public.menu_visibility (role_id, menu_key, label, is_visible, ordre)
    VALUES (r.id, 'pointage', 'Pointage', true, 16)
    ON CONFLICT (role_id, menu_key) DO NOTHING;
  END LOOP;
END $$;
