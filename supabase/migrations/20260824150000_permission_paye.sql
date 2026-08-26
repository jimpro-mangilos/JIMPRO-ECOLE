-- ============================================================
-- Permissions : traitement salarial décidé par l'approbateur
--  · paye = true  → les jours de permission sont payés (comptés
--                  comme jours présents dans le salaire du mois)
--  · paye = false → jours non payés (déduits)
-- ============================================================
ALTER TABLE public.permissions_personnel ADD COLUMN IF NOT EXISTS paye boolean NOT NULL DEFAULT true;
