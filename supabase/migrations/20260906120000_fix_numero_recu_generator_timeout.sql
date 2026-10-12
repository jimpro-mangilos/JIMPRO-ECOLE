-- ============================================================
-- Fix (suite) : numéro de reçu basé sur MAX, sans séquence
-- ============================================================
-- Problème précédent : la version « séquence + boucle de rattrapage »
-- (migration 20260906000000) boucle des milliers de fois quand la
-- séquence est très en retard, ce qui déclenche :
--   "canceling statement due to statement timeout"
--
-- Nouvelle approche : calculer le plus grand numéro existant + 1 en
-- UNE seule requête. Aucune séquence → aucune désynchronisation
-- possible, aucune boucle, aucun timeout.
--
-- Limite connue : en cas d'inserts simultanés, deux requêtes peuvent
-- lire le même MAX. La contrainte UNIQUE(numero_recu) rejette alors le
-- doublon (à réessayer) — sans impact pour un usage mono-utilisateur.
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_numero_recu()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  next_num bigint;
BEGIN
  -- Plus grand suffixe numérique déjà utilisé + 1 (plancher à 1000)
  SELECT GREATEST(
           COALESCE(MAX(SUBSTRING(numero_recu FROM '^RECU-[0-9]{4}-([0-9]+)$')::bigint), 0) + 1,
           1000
         )
    INTO next_num
  FROM public.paiements;

  RETURN 'RECU-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::text, 4, '0');
END;
$$;

-- Hygiène : recale la séquence (désormais inutilisée) pour éviter toute confusion
SELECT setval(
  'numero_recu_seq',
  GREATEST(
    (SELECT COALESCE(MAX(SUBSTRING(numero_recu FROM '^RECU-[0-9]{4}-([0-9]+)$')::bigint), 0) FROM public.paiements),
    999
  )
);
