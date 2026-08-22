-- ============================================================
-- Ajout d'un champ "section" aux types d'uniforme pour filtrer
-- les articles selon la section de l'élève (Primaire vs Secondaire)
-- en plus du sexe (déjà géré par la migration 20260821120000).
--
--   '' / NULL  = toutes sections
--   'Primaire'  = réservé au primaire
--   'Secondaire'= réservé au secondaire
--
-- Règle demandée :
--   - Secondaire : Fille → Jupe, Garçon → Pantalon
--   - Primaire   : Fille → Jupe, Garçon → Culotte
-- ============================================================

ALTER TABLE public.types_uniforme ADD COLUMN IF NOT EXISTS section text;

-- Pantalon : réservé aux garçons (M) du secondaire
UPDATE public.types_uniforme SET sexe = 'M' WHERE sexe IS NULL AND libelle = 'Pantalon';
UPDATE public.types_uniforme SET section = 'Secondaire' WHERE libelle = 'Pantalon' AND section IS NULL;

-- Culotte : réservée aux garçons (M) du primaire
-- (sexe = 'M' déjà posé par la migration 20260821120000)
UPDATE public.types_uniforme SET section = 'Primaire' WHERE libelle = 'Culotte' AND section IS NULL;

-- Jupe : filles, toutes sections (aucune restriction de section)
UPDATE public.types_uniforme SET section = NULL WHERE libelle = 'Jupe';
