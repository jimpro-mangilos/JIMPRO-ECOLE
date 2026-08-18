-- ============================================================
-- Fix: remplace UNIQUE(annee) par UNIQUE(ecole_id, annee)
-- ============================================================
-- L'ancienne contrainte "annee text UNIQUE" empêche deux écoles
-- d'avoir la même année scolaire (ex: "2025-2026").
-- → "duplicate key value violates unique constraint
--    annees_scolaires_annee_key"
--
-- ⚠ VERSION IDEMPOTENTE : peut être relancée sans erreur même
--   si une exécution précédente s'est arrêtée à mi-chemin.
-- ============================================================

-- 1. Supprimer l'ancienne contrainte globale
ALTER TABLE annees_scolaires DROP CONSTRAINT IF EXISTS annees_scolaires_annee_key;

-- 2. Ajouter la contrainte composite par école (si absente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'annees_scolaires_ecole_annee_key'
      AND conrelid = 'annees_scolaires'::regclass
  ) THEN
    ALTER TABLE annees_scolaires
      ADD CONSTRAINT annees_scolaires_ecole_annee_key UNIQUE (ecole_id, annee);
  END IF;
END $$;
