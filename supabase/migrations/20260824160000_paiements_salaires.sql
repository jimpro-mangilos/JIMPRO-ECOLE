-- ============================================================
-- Historique des salaires versés (paie par membre et par mois)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.paiements_salaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  mois text NOT NULL,             -- 'YYYY-MM'
  montant_fc numeric(14, 2) NOT NULL DEFAULT 0,
  montant_usd numeric(14, 2) NOT NULL DEFAULT 0,
  taux_change numeric(12, 2),
  jours_presents integer NOT NULL DEFAULT 0,
  paye_par uuid REFERENCES auth.users(id),
  paye_le timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, personnel_id, mois)
);

CREATE INDEX IF NOT EXISTS idx_paiements_salaires_ecole ON public.paiements_salaires (ecole_id);
CREATE INDEX IF NOT EXISTS idx_paiements_salaires_mois ON public.paiements_salaires (mois);

ALTER TABLE public.paiements_salaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paiements_salaires_select" ON public.paiements_salaires;
CREATE POLICY "paiements_salaires_select" ON public.paiements_salaires FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "paiements_salaires_insert" ON public.paiements_salaires;
CREATE POLICY "paiements_salaires_insert" ON public.paiements_salaires FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "paiements_salaires_update" ON public.paiements_salaires;
CREATE POLICY "paiements_salaires_update" ON public.paiements_salaires FOR UPDATE TO authenticated
  USING ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_permission_approver())
  WITH CHECK ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_permission_approver());

DROP POLICY IF EXISTS "paiements_salaires_delete" ON public.paiements_salaires;
CREATE POLICY "paiements_salaires_delete" ON public.paiements_salaires FOR DELETE TO authenticated
  USING ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_permission_approver());
