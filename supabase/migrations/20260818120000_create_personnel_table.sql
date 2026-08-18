-- ============================================================
-- Module : Gestion du Personnel
-- Table du personnel (enseignants, administratifs, etc.)
-- RLS tenant-scoped (comme les autres tables avec ecole_id)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  matricule text,
  nom text NOT NULL,
  postnom text,
  prenom text NOT NULL,
  sexe text,
  fonction text NOT NULL,
  telephone text,
  email text,
  date_embauche date,
  salaire numeric(12, 2),
  adresse text,
  statut text NOT NULL DEFAULT 'actif',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personnel_ecole ON public.personnel (ecole_id);
CREATE INDEX IF NOT EXISTS idx_personnel_nom ON public.personnel (nom);
CREATE INDEX IF NOT EXISTS idx_personnel_fonction ON public.personnel (fonction);
CREATE INDEX IF NOT EXISTS idx_personnel_statut ON public.personnel (statut);

ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personnel_select" ON public.personnel;
CREATE POLICY "personnel_select" ON public.personnel FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "personnel_insert" ON public.personnel;
CREATE POLICY "personnel_insert" ON public.personnel FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "personnel_update" ON public.personnel;
CREATE POLICY "personnel_update" ON public.personnel FOR UPDATE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "personnel_delete" ON public.personnel;
CREATE POLICY "personnel_delete" ON public.personnel FOR DELETE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- Menu : ajouter l'entrée "personnel" pour tous les rôles existants
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.roles LOOP
    INSERT INTO public.menu_visibility (role_id, menu_key, label, is_visible, ordre)
    VALUES (r.id, 'personnel', 'Personnel', true, 15)
    ON CONFLICT (role_id, menu_key) DO NOTHING;
  END LOOP;
END $$;
