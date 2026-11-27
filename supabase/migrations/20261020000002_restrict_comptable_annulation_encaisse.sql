-- ============================================================
-- Restreindre la demande d'annulation du comptable aux paiements
-- « en_attente » uniquement.
-- ============================================================
-- Règle : un paiement déjà encaissé (approuvé) ne peut plus être
-- annulé par le comptable, ni via la demande d'annulation. Seule
-- la hiérarchie (promoteur / it_manager / admin) peut corriger un
-- paiement encaissé via annuler_paiement().
-- ============================================================

CREATE OR REPLACE FUNCTION public.demander_annulation_paiement(p_paiement_id uuid, p_motif text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_paiement public.paiements%ROWTYPE;
  v_demandeur text;
  v_existing uuid;
  v_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid() AND r.nom = 'comptable'
  ) THEN
    RAISE EXCEPTION 'Seul le comptable peut demander une annulation.';
  END IF;

  IF p_motif IS NULL OR btrim(p_motif) = '' THEN
    RAISE EXCEPTION 'Le motif d''annulation est requis.';
  END IF;

  SELECT * INTO v_paiement FROM public.paiements WHERE id = p_paiement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement introuvable.';
  END IF;

  IF v_paiement.statut = 'annule' THEN
    RAISE EXCEPTION 'Ce paiement est déjà annulé.';
  END IF;

  IF v_paiement.statut = 'encaisse' THEN
    RAISE EXCEPTION 'Un paiement encaissé ne peut pas être annulé par le comptable. Contactez la hiérarchie (promoteur / it_manager / admin).';
  END IF;

  SELECT id INTO v_existing FROM public.demandes_annulation
  WHERE paiement_id = p_paiement_id AND statut = 'en_attente'
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'Une demande d''annulation est déjà en attente pour ce paiement.';
  END IF;

  SELECT COALESCE(p.prenom || ' ' || p.nom, '') INTO v_demandeur
  FROM public.profiles p WHERE p.id = auth.uid();

  INSERT INTO public.demandes_annulation
    (ecole_id, paiement_id, motif, demandeur_id, demandeur_nom)
  VALUES
    (v_paiement.ecole_id, p_paiement_id, btrim(p_motif), auth.uid(), v_demandeur)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.demander_annulation_paiement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demander_annulation_paiement(uuid, text) TO authenticated;
