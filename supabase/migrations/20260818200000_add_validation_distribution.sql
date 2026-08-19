-- ============================================================
-- Validation des redistributions d'uniformes
-- Si un élève reçoit un article déjà distribué, la nouvelle
-- distribution passe en "en_attente" (ne décrémente pas le stock)
-- et doit être validée par un approbateur (admin / it_manager / promoteur).
-- ============================================================

ALTER TABLE public.gestion_uniformes ADD COLUMN IF NOT EXISTS statut text NOT NULL DEFAULT 'valide';

-- Trigger de déduction : ne décrémente que si la distribution est "valide"
CREATE OR REPLACE FUNCTION check_and_decrement_uniforme_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_record stock_uniformes%ROWTYPE;
  v_taille text := COALESCE(NEW.taille, 'M');
BEGIN
  -- Distribution en attente de validation : aucune déduction de stock
  IF NEW.statut <> 'valide' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_stock_record
  FROM stock_uniformes
  WHERE type_uniforme_id = NEW.type_uniforme_id
    AND annee_scolaire = NEW.annee_scolaire
    AND COALESCE(section, '') = COALESCE(NEW.section, '')
    AND taille = v_taille
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock non configuré pour % (taille %) et année %.',
      NEW.type_uniforme_libelle, v_taille, NEW.annee_scolaire;
  END IF;

  IF v_stock_record.quantite_stock < NEW.quantite THEN
    RAISE EXCEPTION 'Stock insuffisant pour % (taille %) : % disponible(s), % demandé(s).',
      NEW.type_uniforme_libelle, v_taille, v_stock_record.quantite_stock, NEW.quantite;
  END IF;

  UPDATE stock_uniformes
  SET quantite_stock = quantite_stock - NEW.quantite, updated_at = now()
  WHERE id = v_stock_record.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction : valider une distribution en attente (décrémente le stock puis passe à "valide")
CREATE OR REPLACE FUNCTION public.valider_distribution_uniforme(p_id uuid)
RETURNS void AS $$
DECLARE
  v_distribution gestion_uniformes%ROWTYPE;
  v_stock stock_uniformes%ROWTYPE;
  v_taille text;
BEGIN
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
