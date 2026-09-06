-- ============================================================
-- REPORT DES PRISES EN CHARGE NON DÉDUITES (salaire nul,
-- plafond 80 % du brut...) : le solde s'impute sur les mois
-- suivants, dès qu'un salaire est calculé.
--  · paiements_salaires.retenue_fc : retenue effectivement
--    appliquée lors du « Marquer payé » (pour le calcul du
--    solde reporté : prises en charge − retenues enregistrées).
-- ============================================================

ALTER TABLE public.paiements_salaires ADD COLUMN IF NOT EXISTS retenue_fc numeric NOT NULL DEFAULT 0;