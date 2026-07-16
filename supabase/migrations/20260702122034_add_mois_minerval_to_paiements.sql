-- Add mois_minerval column to paiements table for tracking monthly Minerval payments
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS mois_minerval text;

-- Add a unique constraint to prevent duplicate Minerval payments for the same month/student/year
CREATE UNIQUE INDEX IF NOT EXISTS idx_paiements_minerval_unique_month
  ON paiements (eleve_id, type_paiement, annee_scolaire, mois_minerval)
  WHERE mois_minerval IS NOT NULL AND statut != 'annule';
