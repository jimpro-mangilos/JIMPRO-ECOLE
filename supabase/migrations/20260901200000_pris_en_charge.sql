-- ============================================================
-- ÉLÈVES PRIS EN CHARGE PAR LE PERSONNEL
--  · prises_en_charge_personnel : lien élève ↔ membre (enfant,
--    boursier...) avec approbation (secrétaire saisit → en_attente,
--    IT Manager / Promoteur / Admin approuve → active).
--  · Un élève ne peut avoir qu'UNE fiche en attente/active à la fois.
--  · Paiements en mode 'prise_en_charge' : déduits du salaire du membre.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prises_en_charge_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  eleve_id uuid NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'enfant',      -- enfant | boursier | autre
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  date_fin date,
  statut text NOT NULL DEFAULT 'en_attente', -- en_attente | active | refusee | cloturee
  motif text,
  demande_par uuid REFERENCES auth.users(id),
  decide_par uuid REFERENCES auth.users(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

-- Un élève ne peut avoir qu'UNE prise en charge en attente/active
CREATE UNIQUE INDEX IF NOT EXISTS uq_pec_eleve_actif
  ON public.prises_en_charge_personnel (eleve_id)
  WHERE statut IN ('en_attente', 'active');

CREATE INDEX IF NOT EXISTS idx_pec_ecole ON public.prises_en_charge_personnel (ecole_id);
CREATE INDEX IF NOT EXISTS idx_pec_personnel ON public.prises_en_charge_personnel (personnel_id);
CREATE INDEX IF NOT EXISTS idx_pec_eleve ON public.prises_en_charge_personnel (eleve_id);

ALTER TABLE public.prises_en_charge_personnel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pec_select" ON public.prises_en_charge_personnel;
CREATE POLICY "pec_select" ON public.prises_en_charge_personnel FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "pec_insert" ON public.prises_en_charge_personnel;
CREATE POLICY "pec_insert" ON public.prises_en_charge_personnel FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- Décision (approuver / refuser / clôturer) réservée aux approbateurs
DROP POLICY IF EXISTS "pec_update" ON public.prises_en_charge_personnel;
CREATE POLICY "pec_update" ON public.prises_en_charge_personnel FOR UPDATE TO authenticated
  USING ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_permission_approver())
  WITH CHECK ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_permission_approver());

-- Paiements « prise en charge » : le membre concerné (déduction sur salaire)
ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS personnel_id uuid;
CREATE INDEX IF NOT EXISTS idx_paiements_personnel ON public.paiements (personnel_id, date_paiement);

-- Autoriser le mode 'prise_en_charge' dans la contrainte du mode de paiement
ALTER TABLE public.paiements DROP CONSTRAINT IF EXISTS paiements_mode_paiement_check;
ALTER TABLE public.paiements ADD CONSTRAINT paiements_mode_paiement_check
  CHECK (mode_paiement IN ('especes', 'mobile_money', 'virement', 'cheque', 'prise_en_charge'));
