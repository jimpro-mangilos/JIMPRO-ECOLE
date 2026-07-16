/*
  # Différenciation du stock uniformes par section

  ## Résumé
  Ajoute la notion de section au stock d'uniformes. Chaque article est maintenant
  géré par triplet (article, année scolaire, section), permettant de stocker
  séparément les quantités pour la Maternelle, le Primaire, le Secondaire, etc.

  ## Modifications

  ### Table `stock_uniformes`
  - Ajout de la colonne `section` (text, NOT NULL, default '')
  - Suppression de l'ancienne contrainte unique `unique_stock_par_article_annee`
  - Ajout d'une nouvelle contrainte unique sur (type_uniforme_id, annee_scolaire, section)

  ### Fonction trigger `check_and_decrement_uniforme_stock`
  - Recherche maintenant le stock par (type_uniforme_id, annee_scolaire, section)
  - Message d'erreur incluant la section concernée

  ## Notes
  1. Les enregistrements existants conservent une section vide ('') par défaut.
     Les administrateurs doivent assigner une section aux stocks existants.
  2. La contrainte unique permet d'avoir des stocks séparés par section pour
     un même article et une même année.
*/

-- Ajouter la colonne section si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_uniformes' AND column_name = 'section'
  ) THEN
    ALTER TABLE stock_uniformes ADD COLUMN section text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Remplacer l'ancienne contrainte unique
ALTER TABLE stock_uniformes DROP CONSTRAINT IF EXISTS unique_stock_par_article_annee;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_stock_par_article_annee_section'
  ) THEN
    ALTER TABLE stock_uniformes
      ADD CONSTRAINT unique_stock_par_article_annee_section
      UNIQUE (type_uniforme_id, annee_scolaire, section);
  END IF;
END $$;

-- Nouvel index prenant en compte la section
DROP INDEX IF EXISTS idx_stock_uniformes_type_annee;
CREATE INDEX IF NOT EXISTS idx_stock_uniformes_type_annee_section
  ON stock_uniformes(type_uniforme_id, annee_scolaire, section);

-- Mise à jour du trigger pour prendre en compte la section
CREATE OR REPLACE FUNCTION check_and_decrement_uniforme_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_record stock_uniformes%ROWTYPE;
BEGIN
  SELECT * INTO v_stock_record
  FROM stock_uniformes
  WHERE type_uniforme_id = NEW.type_uniforme_id
    AND annee_scolaire = NEW.annee_scolaire
    AND section = COALESCE(NEW.section, '')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock non configuré pour cet article (%) en section "%" pour l''année scolaire "%". Veuillez d''abord approvisionner le stock.',
      NEW.type_uniforme_libelle, COALESCE(NEW.section, '(aucune)'), NEW.annee_scolaire;
  END IF;

  IF v_stock_record.quantite_stock < NEW.quantite THEN
    RAISE EXCEPTION 'Stock insuffisant pour % en section "%" : % article(s) disponible(s), % demandé(s).',
      NEW.type_uniforme_libelle,
      COALESCE(NEW.section, '(aucune)'),
      v_stock_record.quantite_stock,
      NEW.quantite;
  END IF;

  UPDATE stock_uniformes
  SET
    quantite_stock = quantite_stock - NEW.quantite,
    updated_at = now()
  WHERE id = v_stock_record.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
