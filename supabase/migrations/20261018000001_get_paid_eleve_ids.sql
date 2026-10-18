-- ============================================================
-- Correction des statistiques « en ordre » (élèves à jour)
-- ============================================================
-- Problème : les rôles autorisés à voir les paiements affichaient des
-- effectifs « en ordre » différents (RLS + école).
--
-- Solution : une fonction SECURITY DEFINER qui renvoie UN SEUL jsonb des ids
-- d'élèves à jour (donc sans la limite de 1 000 lignes), MAIS uniquement pour
-- les rôles réellement autorisés à voir les paiements. Les autres rôles
-- (gestionnaire_uniforme, enseignant, revoque…) reçoivent un tableau vide.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_paid_eleve_ids(uuid, text);

CREATE OR REPLACE FUNCTION public.get_paid_eleve_ids(p_ecole uuid, p_mois text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $F$
  SELECT COALESCE(jsonb_agg(DISTINCT p.eleve_id), '[]'::jsonb)
  FROM public.paiements p
  WHERE p.ecole_id = p_ecole
    AND p.mois_minerval = p_mois
    AND p.statut <> 'annule'
    AND EXISTS (
      SELECT 1
      FROM public.profiles u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND r.nom = ANY (ARRAY['admin','it_manager','comptable','secretaire','directeur','promoteur','coordonnateur'])
    );
$F$;

REVOKE EXECUTE ON FUNCTION public.get_paid_eleve_ids(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_paid_eleve_ids(uuid, text) TO authenticated;
