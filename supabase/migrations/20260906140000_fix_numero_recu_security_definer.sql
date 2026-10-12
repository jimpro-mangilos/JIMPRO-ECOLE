-- ============================================================
-- Fix (définitif) : numéro de reçu GLOBAL via SECURITY DEFINER
-- ============================================================
-- Contexte multi-écoles :
--   - La contrainte UNIQUE(numero_recu) est GLOBALE (toutes écoles).
--   - generate_numero_recu() était SECURITY INVOKER : elle s'exécute
--     avec les droits de l'utilisateur connecté, donc soumise au
--     scoping RLS par école → MAX calculé sur UNE seule école.
--     Or les numéros se chevauchent entre écoles (école A jusqu'à
--     9999, école B jusqu'à 3100) → doublon global.
--
-- Correction :
--   1. SECURITY DEFINER : la fonction s'exécute en tant que propriétaire
--      (postgres), contourne le RLS et voit TOUS les reçus → MAX global.
--   2. split_part() : extraction du numéro sans regex (la regex
--      SUBSTRING(... FROM ...) ne matchait pas les valeurs existantes).
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_numero_recu()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_num bigint;
BEGIN
  SELECT COALESCE(MAX(split_part(numero_recu, '-', 3)::bigint), 0) + 1
    INTO next_num
  FROM public.paiements
  WHERE numero_recu LIKE 'RECU-%';

  IF next_num < 1000 THEN
    next_num := 1000;
  END IF;

  RETURN 'RECU-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
END;
$$;
