-- ============================================================
-- Fix (définitif) : retour à la séquence GLOBALE
-- ============================================================
-- Pourquoi les versions « MAX » échouaient :
--   generate_numero_recu() était SECURITY INVOKER : elle s'exécute avec
--   les droits de l'utilisateur connecté, donc soumise au RLS par école.
--   Elle calculait donc un MAX LOCAL à l'école (ex : école B → 3101),
--   alors que la contrainte UNIQUE(numero_recu) est GLOBALE → doublon
--   (3101 existe déjà chez l'école A).
--
-- Correction : réutiliser la séquence numero_recu_seq, qui est GLOBALE
--   et insensible au RLS (les séquences n'ont pas de RLS). On la recale
--   simplement sur le numéro le plus élevé déjà utilisé.
-- ============================================================

-- 1) Recale la séquence sur le plus grand numéro déjà utilisé (toutes écoles)
SELECT setval(
  'numero_recu_seq',
  GREATEST(
    (SELECT COALESCE(MAX(split_part(numero_recu, '-', 3)::bigint), 0)
       FROM public.paiements
      WHERE numero_recu LIKE 'RECU-%'),
    999
  )
);

-- 2) Générateur basé sur la séquence (globale, pas de RLS, pas de regex)
CREATE OR REPLACE FUNCTION public.generate_numero_recu()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  next_num bigint;
BEGIN
  next_num := nextval('numero_recu_seq');
  RETURN 'RECU-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
END;
$$;
