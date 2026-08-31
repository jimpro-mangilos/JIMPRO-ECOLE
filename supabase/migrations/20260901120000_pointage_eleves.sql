-- ============================================================
-- Portail de pointage des ÉLÈVES
-- L'élève (ou le surveillant) scanne la carte d'élève (QR code)
-- ou saisit le matricule : l'arrivée puis le départ sont enregistrés.
-- Statut calculé selon l'heure d'entrée configurée (app_settings
-- pointage_heure_entree / pointage_heure_sortie, mêmes clés que le
-- pointage du personnel pour rester cohérent).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pointages_eleves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id uuid NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  date_pointage date NOT NULL DEFAULT CURRENT_DATE,
  heure_arrivee time,
  heure_depart time,
  statut text NOT NULL DEFAULT 'present',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (eleve_id, date_pointage)
);

CREATE INDEX IF NOT EXISTS idx_pointages_eleves_ecole ON public.pointages_eleves (ecole_id);
CREATE INDEX IF NOT EXISTS idx_pointages_eleves_date ON public.pointages_eleves (date_pointage);
CREATE INDEX IF NOT EXISTS idx_pointages_eleves_eleve ON public.pointages_eleves (eleve_id);

ALTER TABLE public.pointages_eleves ENABLE ROW LEVEL SECURITY;

-- Accès authentifié (gestion dans l'app) : lecture/insertion/maj scoped école
DROP POLICY IF EXISTS "pointages_eleves_select_auth" ON public.pointages_eleves;
CREATE POLICY "pointages_eleves_select_auth" ON public.pointages_eleves FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "pointages_eleves_insert_auth" ON public.pointages_eleves;
CREATE POLICY "pointages_eleves_insert_auth" ON public.pointages_eleves FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "pointages_eleves_update_auth" ON public.pointages_eleves;
CREATE POLICY "pointages_eleves_update_auth" ON public.pointages_eleves FOR UPDATE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "pointages_eleves_delete_auth" ON public.pointages_eleves;
CREATE POLICY "pointages_eleves_delete_auth" ON public.pointages_eleves FOR DELETE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- Accès anon (portail public de pointage) : lecture des élèves + écriture des pointages
DROP POLICY IF EXISTS "pointages_eleves_select_anon" ON public.pointages_eleves;
CREATE POLICY "pointages_eleves_select_anon" ON public.pointages_eleves FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "pointages_eleves_insert_anon" ON public.pointages_eleves;
CREATE POLICY "pointages_eleves_insert_anon" ON public.pointages_eleves FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "pointages_eleves_update_anon" ON public.pointages_eleves;
CREATE POLICY "pointages_eleves_update_anon" ON public.pointages_eleves FOR UPDATE TO anon USING (true) WITH CHECK (true);
