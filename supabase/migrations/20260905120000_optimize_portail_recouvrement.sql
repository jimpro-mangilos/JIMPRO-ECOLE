-- ============================================================
-- Optimisation du portail de recouvrement (performance)
--  · RPC verifier_statut_eleve : résout l'élève + son paiement du
--    mois EN UNE SEULE requête (au lieu de 2-3 requêtes séquentielles).
--  · Index composite pour la recherche de paiement par mois.
-- ============================================================

-- Index pour la recherche de paiement (école + élève + mois + année)
CREATE INDEX IF NOT EXISTS idx_paiements_verif_ecole_eleve_mois_annee
  ON public.paiements (ecole_id, eleve_id, mois_minerval, annee_scolaire);

-- Fonction SECURITY DEFINER : lisible par anon (portail public) sans exposer
-- toute la table. Retourne un objet JSON { trouve, autre_ecole, eleve, paiement }.
CREATE OR REPLACE FUNCTION public.verifier_statut_eleve(
  p_ecole uuid,
  p_matricule text,
  p_mois text,
  p_annee text,
  p_motif_libelle text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_eleve record;
  v_paiement record;
BEGIN
  -- Le matricule est UNIQUE globalement → une seule lecture suffit.
  SELECT id, matricule, nom, postnom, prenom, section, classe, photo_url, ecole_id
    INTO v_eleve
    FROM eleves
   WHERE matricule = upper(trim(p_matricule))
   LIMIT 1;

  IF v_eleve.id IS NULL THEN
    RETURN json_build_object('trouve', false, 'autre_ecole', false);
  END IF;

  IF v_eleve.ecole_id IS DISTINCT FROM p_ecole THEN
    RETURN json_build_object('trouve', false, 'autre_ecole', true);
  END IF;

  SELECT id, montant_paye, date_paiement, type_paiement, motif_libelle, statut, created_at
    INTO v_paiement
    FROM paiements
   WHERE ecole_id = p_ecole
     AND eleve_id = v_eleve.id
     AND mois_minerval = p_mois
     AND annee_scolaire = p_annee
     AND statut <> 'annule'
     AND (p_motif_libelle IS NULL OR motif_libelle = p_motif_libelle)
   ORDER BY created_at DESC
   LIMIT 1;

  RETURN json_build_object(
    'trouve', true,
    'autre_ecole', false,
    'eleve', json_build_object(
      'id', v_eleve.id,
      'matricule', v_eleve.matricule,
      'nom', v_eleve.nom,
      'postnom', v_eleve.postnom,
      'prenom', v_eleve.prenom,
      'section', v_eleve.section,
      'classe', v_eleve.classe,
      'photo_url', v_eleve.photo_url
    ),
    'paiement', CASE WHEN v_paiement.id IS NULL THEN NULL ELSE json_build_object(
      'id', v_paiement.id,
      'montant_paye', v_paiement.montant_paye,
      'date_paiement', v_paiement.date_paiement,
      'type_paiement', v_paiement.type_paiement,
      'motif_libelle', v_paiement.motif_libelle,
      'statut', v_paiement.statut,
      'created_at', v_paiement.created_at
    ) END
  );
END;
$$;

-- Accessible au portail public (anon) et aux utilisateurs connectés
GRANT EXECUTE ON FUNCTION public.verifier_statut_eleve(uuid, text, text, text, text) TO anon, authenticated;
