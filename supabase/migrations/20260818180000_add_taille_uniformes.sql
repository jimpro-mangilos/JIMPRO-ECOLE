-- ============================================================
-- Ajout de la taille (size) aux uniformes :
-- stock_uniformes, gestion_uniformes (distribution), demandes_stock
-- ============================================================

ALTER TABLE public.stock_uniformes ADD COLUMN IF NOT EXISTS taille text NOT NULL DEFAULT 'M';
ALTER TABLE public.gestion_uniformes ADD COLUMN IF NOT EXISTS taille text;
ALTER TABLE public.demandes_stock ADD COLUMN IF NOT EXISTS taille text NOT NULL DEFAULT 'M';

-- Contrainte unique de stock : inclut la taille
ALTER TABLE public.stock_uniformes DROP CONSTRAINT IF EXISTS stock_ecole_article_annee_section_key;
ALTER TABLE public.stock_uniformes DROP CONSTRAINT IF EXISTS unique_stock_par_article_annee_section;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stock_ecole_article_annee_section_taille_key'
      AND conrelid = 'stock_uniformes'::regclass
  ) THEN
    ALTER TABLE public.stock_uniformes
      ADD CONSTRAINT stock_ecole_article_annee_section_taille_key
      UNIQUE (ecole_id, type_uniforme_id, annee_scolaire, section, taille);
  END IF;
END $$;

-- Redéfinition du trigger de déduction du stock (recherche par taille)
CREATE OR REPLACE FUNCTION check_and_decrement_uniforme_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_record stock_uniformes%ROWTYPE;
  v_taille text := COALESCE(NEW.taille, 'M');
BEGIN
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
