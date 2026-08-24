-- ============================================================
-- Vérification publique d'un reçu de paiement (lien imprimé
-- sur la facture : /verifier-facture/:numero).
-- Fonction SECURITY DEFINER : lisible par anon (page publique)
-- sans exposer toute la table paiements.
-- ============================================================

CREATE OR REPLACE FUNCTION public.verifier_facture(p_numero text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'trouve', true,
    'numero_recu', p.numero_recu,
    'eleve', p.nom_eleve,
    'matricule', p.matricule,
    'postnom', p.postnom,
    'prenom', p.prenom,
    'classe', p.classe,
    'montant_paye', p.montant_paye,
    'type_paiement', tp.libelle,
    'statut', p.statut,
    'est_encaisse', p.est_encaisse,
    'date_encaissement', p.date_encaissement,
    'annee_scolaire', p.annee_scolaire,
    'nom_comptable', p.nom_comptable,
    'ecole_nom', e.nom
  ) INTO result
  FROM paiements p
  LEFT JOIN ecoles e ON e.id = p.ecole_id
  LEFT JOIN types_paiement tp ON tp.id = p.type_paiement
  WHERE UPPER(TRIM(p.numero_recu)) = UPPER(TRIM(p_numero))
  LIMIT 1;

  IF result IS NULL THEN
    RETURN json_build_object('trouve', false);
  END IF;
  RETURN result;
END;
$$;

-- Accessible à tous (vérification publique) et aux utilisateurs connectés
GRANT EXECUTE ON FUNCTION public.verifier_facture(text) TO anon, authenticated;