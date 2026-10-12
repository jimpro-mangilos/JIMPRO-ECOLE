-- ============================================================
-- Fix (définitif) : numéro de reçu basé sur MAX via split_part
-- ============================================================
-- La version précédente (20260906120000) utilisait
-- SUBSTRING(numero_recu FROM 'regex'), qui ne matche pas les numéros
-- existants : MAX retombait sur NULL → plancher 1000 → « duplicate key ».
--
-- On remplace par split_part(numero_recu, '-', 3) (aucune regex) pour
-- extraire le numéro du format RECU-AAAA-NNNN, puis on prend MAX + 1.
-- Aucune séquence → aucune désynchronisation ni timeout possible.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_numero_recu()
RETURNS text
LANGUAGE plpgsql
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
