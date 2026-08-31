-- ============================================================
-- Permissions / justificatifs d'absence des ÉLÈVES
--  · table permissions_eleves : demandes de permission soumises
--    à l'approbation (promoteur / it_manager / admin), comme pour
--    le personnel (permissions_personnel)
--  · une permission approuvée compte comme « Permission » dans le
--    pointage des élèves (bilan, grille, rapport PDF)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.permissions_eleves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id uuid NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  motif text,
  statut text NOT NULL DEFAULT 'en_attente',
  demande_par uuid REFERENCES auth.users(id),
  decide_par uuid REFERENCES auth.users(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_permissions_eleves_ecole ON public.permissions_eleves (ecole_id);
CREATE INDEX IF NOT EXISTS idx_permissions_eleves_eleve ON public.permissions_eleves (eleve_id);
CREATE INDEX IF NOT EXISTS idx_permissions_eleves_statut ON public.permissions_eleves (statut);

ALTER TABLE public.permissions_eleves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_eleves_select" ON public.permissions_eleves;
CREATE POLICY "permissions_eleves_select" ON public.permissions_eleves FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "permissions_eleves_insert" ON public.permissions_eleves;
CREATE POLICY "permissions_eleves_insert" ON public.permissions_eleves FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- Seuls les approbateurs (promoteur / it_manager / admin) peuvent décider
-- (réutilise la fonction is_permission_approver() créée pour le personnel)
DROP POLICY IF EXISTS "permissions_eleves_update" ON public.permissions_eleves;
CREATE POLICY "permissions_eleves_update" ON public.permissions_eleves FOR UPDATE TO authenticated
  USING ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_permission_approver())
  WITH CHECK ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_permission_approver());
