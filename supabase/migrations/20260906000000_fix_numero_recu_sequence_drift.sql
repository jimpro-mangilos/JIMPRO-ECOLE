-- ============================================================
-- Fix: resynchronise la séquence numero_recu_seq
-- ============================================================
-- Symptôme :
--   duplicate key value violates unique constraint
--   "paiements_numero_recu_key" lors de l'ajout d'un paiement.
--
-- Cause :
--   generate_numero_recu() tire le prochain numéro de la séquence
--   numero_recu_seq. Si cette séquence est « en retard » sur les
--   numéros déjà présents en base (restauration de sauvegarde, import
--   de données avec numero_recu explicite, etc.), nextval() renvoie un
--   numéro déjà utilisé et la contrainte UNIQUE(numero_recu) échoue.
--
-- Correction (idempotente, peut être relancée sans risque) :
--   1. Recale la séquence sur le plus grand numéro déjà utilisé
--      (nextval() renverra ensuite max + 1), sans jamais l'abaisser.
--   2. Rend generate_numero_recu() auto-réparante : en cas de collision,
--      elle avance la séquence jusqu'à trouver un numéro libre.
-- ============================================================

-- 1) Recalage de la séquence sur le plus grand suffixe numérique déjà utilisé
--    (on ne considère que le format produit par le générateur : RECU-AAAA-NNNN).
--    last_value de la séquence sert de plancher pour ne jamais l'abaisser.
DO $$
DECLARE
  max_used bigint;
  seq_last bigint;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(numero_recu FROM '^RECU-\d{4}-(\d+)$')::bigint), 0)
    INTO max_used
  FROM public.paiements;

  SELECT last_value INTO seq_last FROM numero_recu_seq;

  PERFORM setval('numero_recu_seq', GREATEST(max_used, seq_last, 999));
END;
$$;

-- 2) Générateur auto-réparant : avance la séquence en cas de collision
--    (préserve le search_path durci par la migration 20260424011051)
CREATE OR REPLACE FUNCTION public.generate_numero_recu()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  next_num bigint;
  receipt_num text;
BEGIN
  LOOP
    next_num := nextval('numero_recu_seq');
    receipt_num := 'RECU-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
    -- Si le numéro existe déjà (séquence désynchronisée), on avance et on réessaie.
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.paiements WHERE numero_recu = receipt_num);
  END LOOP;
  RETURN receipt_num;
END;
$$;
