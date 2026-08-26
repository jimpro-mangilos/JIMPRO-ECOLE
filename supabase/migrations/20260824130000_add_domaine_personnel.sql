-- ============================================================
-- Ajout du champ "domaine" (domaine d'activité du membre) au personnel
-- ============================================================
ALTER TABLE public.personnel ADD COLUMN IF NOT EXISTS domaine text;
