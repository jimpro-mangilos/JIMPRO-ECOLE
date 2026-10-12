-- ============================================================
-- Fix (RACINE) : LPAD tronquait les numéros >= 10000
-- ============================================================
-- Cause réelle de "duplicate key value violates unique constraint
-- paiements_numero_recu_key" :
--   LPAD(nextval(...)::text, 4, '0') TRONQUE les nombres à 4 chiffres.
--   Exemple : LPAD('10000', 4, '0') = '1000'  → entre en collision
--   avec le reçu RECU-2026-1000 déjà existant.
--
--   La séquence dépassait 9999 (10000, 10001, ...), mais LPAD ramenait
--   toujours le résultat dans 1000-9999 → doublon systématique.
--
-- Correction : supprimer LPAD, renvoyer le numéro brut.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_numero_recu()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN 'RECU-' || to_char(CURRENT_DATE, 'YYYY') || '-' || nextval('public.numero_recu_seq')::text;
END;
$$;
