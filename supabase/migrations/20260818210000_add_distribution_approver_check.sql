-- ============================================================
-- Restriction côté base : seuls certains rôles peuvent valider/refuser
-- une redistribution d'uniforme (en_attente → valide / refuse).
-- ============================================================

-- Rôle autorisé à valider/refuser une redistribution
CREATE OR REPLACE FUNCTION public.is_distribution_approver()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND r.nom IN ('secretaire', 'comptable', 'coordonnateur', 'it_manager', 'admin', 'promoteur')
  );
$$;

-- Validation (avec contrôle de rôle) : décrémente le stock puis passe à "valide"
CREATE OR REPLACE FUNCTION public.valider_distribution_uniforme(p_id uuid)
RETURNS void AS $$
DECLARE
  v_distribution gestion_uniformes%ROWTYPE;
  v_stock stock_uniformes%ROWTYPE;
  v_taille text;
BEGIN
  IF NOT public.is_distribution_approver() THEN
    RAISE EXCEPTION 'Action non autorisée : rôle insuffisant';
  END IF;

  SELECT * INTO v_distribution FROM gestion_uniformes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Distribution introuvable';
  END IF;
  IF v_distribution.statut <> 'en_attente' THEN
    RAISE EXCEPTION 'Distribution déjà traitée';
  END IF;

  v_taille := COALESCE(v_distribution.taille, 'M');
  SELECT * INTO v_stock
  FROM stock_uniformes
  WHERE type_uniforme_id = v_distribution.type_uniforme_id
    AND annee_scolaire = v_distribution.annee_scolaire
    AND COALESCE(section, '') = COALESCE(v_distribution.section, '')
    AND taille = v_taille
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock non configuré pour % (taille %) et année %.',
      v_distribution.type_uniforme_libelle, v_taille, v_distribution.annee_scolaire;
  END IF;

  IF v_stock.quantite_stock < v_distribution.quantite THEN
    RAISE EXCEPTION 'Stock insuffisant pour % (taille %) : % disponible(s).',
      v_distribution.type_uniforme_libelle, v_taille, v_stock.quantite_stock;
  END IF;

  UPDATE stock_uniformes
  SET quantite_stock = quantite_stock - v_distribution.quantite, updated_at = now()
  WHERE id = v_stock.id;

  UPDATE gestion_uniformes SET statut = 'valide' WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refus (avec contrôle de rôle) : passe la distribution à "refuse" (aucun impact stock)
CREATE OR REPLACE FUNCTION public.refuser_distribution_uniforme(p_id uuid)
RETURNS void AS $$
DECLARE
  v_distribution gestion_uniformes%ROWTYPE;
BEGIN
  IF NOT public.is_distribution_approver() THEN
    RAISE EXCEPTION 'Action non autorisée : rôle insuffisant';
  END IF;

  SELECT * INTO v_distribution FROM gestion_uniformes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Distribution introuvable';
  END IF;
  IF v_distribution.statut <> 'en_attente' THEN
    RAISE EXCEPTION 'Distribution déjà traitée';
  END IF;

  UPDATE gestion_uniformes SET statut = 'refuse' WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
