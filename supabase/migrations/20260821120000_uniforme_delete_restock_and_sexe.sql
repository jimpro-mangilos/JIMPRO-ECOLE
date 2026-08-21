-- ============================================================
-- 1) Restitution au stock lors de la suppression d'une distribution
-- 2) Ajout d'un champ "sexe" aux types d'uniforme (filtrage à la distribution)
-- ============================================================

-- 1) Retour au stock quand on supprime une distribution validée.
--    (en_attente / refuse n'ont jamais déduit le stock → rien à restituer)
CREATE OR REPLACE FUNCTION public.return_uniforme_stock_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_taille text := COALESCE(OLD.taille, 'M');
BEGIN
  IF OLD.statut = 'valide' THEN
    UPDATE stock_uniformes
    SET quantite_stock = quantite_stock + OLD.quantite, updated_at = now()
    WHERE type_uniforme_id = OLD.type_uniforme_id
      AND annee_scolaire = OLD.annee_scolaire
      AND COALESCE(section, '') = COALESCE(OLD.section, '')
      AND taille = v_taille;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_return_stock_on_delete ON public.gestion_uniformes;
CREATE TRIGGER trg_return_stock_on_delete
BEFORE DELETE ON public.gestion_uniformes
FOR EACH ROW EXECUTE FUNCTION public.return_uniforme_stock_on_delete();

-- 2) Champ "sexe" pour les types d'uniforme.
--    '' / NULL = unisexe, 'M' = garçons, 'F' = filles.
ALTER TABLE public.types_uniforme ADD COLUMN IF NOT EXISTS sexe text;

-- 3) Pré-renseigner les articles sexués explicitement demandés.
UPDATE public.types_uniforme SET sexe = 'M' WHERE sexe IS NULL AND libelle = 'Culotte';
UPDATE public.types_uniforme SET sexe = 'F' WHERE sexe IS NULL AND libelle = 'Jupe';
UPDATE public.types_uniforme SET sexe = 'M' WHERE sexe IS NULL AND libelle = 'Cravate';
UPDATE public.types_uniforme SET sexe = 'F' WHERE sexe IS NULL AND libelle ILIKE 'Nœud%';
