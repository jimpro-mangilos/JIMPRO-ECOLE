-- ============================================================
-- Modifier une ligne de distribution (taille / quantité) avec
-- mise à jour automatique du stock.
--
-- Scénario typique : remplacement / échange d'un article d'une
-- taille qui revient pour une autre taille. La distribution
-- validée a déjà déduit le stock ; en changeant la taille :
--   1. l'ancienne taille est restituée au stock,
--   2. la nouvelle taille est déduite du stock.
-- ============================================================

-- Rôle autorisé à modifier une distribution :
-- les approbateurs + le gestionnaire d'uniformes.
CREATE OR REPLACE FUNCTION public.is_distribution_editor()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND r.nom IN (
        'admin', 'it_manager', 'secretaire', 'comptable',
        'coordonnateur', 'promoteur', 'gestionnaire_uniforme'
      )
  );
$$;

-- Modifie la taille et/ou la quantité d'une distribution en ajustant le stock.
CREATE OR REPLACE FUNCTION public.modifier_distribution_uniforme(
  p_id uuid,
  p_taille text,
  p_quantite integer
)
RETURNS void AS $$
DECLARE
  v_distribution gestion_uniformes%ROWTYPE;
  v_old_taille text;
  v_new_taille text;
  v_stock_old stock_uniformes%ROWTYPE;
  v_stock_new stock_uniformes%ROWTYPE;
  v_echange_note text;
BEGIN
  IF NOT public.is_distribution_editor() THEN
    RAISE EXCEPTION 'Action non autorisée : rôle insuffisant';
  END IF;

  IF p_quantite IS NULL OR p_quantite < 1 THEN
    RAISE EXCEPTION 'Quantité invalide';
  END IF;

  v_new_taille := COALESCE(NULLIF(TRIM(p_taille), ''), 'M');

  SELECT * INTO v_distribution FROM gestion_uniformes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Distribution introuvable';
  END IF;

  v_old_taille := COALESCE(v_distribution.taille, 'M');

  -- Seule une distribution "valide" a déjà déduit le stock :
  -- on restitue l'ancien, puis on déduit le nouveau.
  IF v_distribution.statut = 'valide'
     AND (v_old_taille <> v_new_taille OR v_distribution.quantite <> p_quantite) THEN

    -- 1) Restituer l'ancienne quantité à l'ancienne taille
    SELECT * INTO v_stock_old
    FROM stock_uniformes
    WHERE type_uniforme_id = v_distribution.type_uniforme_id
      AND annee_scolaire = v_distribution.annee_scolaire
      AND COALESCE(section, '') = COALESCE(v_distribution.section, '')
      AND taille = v_old_taille
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock non configuré pour % (taille %) et année % : impossible de restituer.',
        v_distribution.type_uniforme_libelle, v_old_taille, v_distribution.annee_scolaire;
    END IF;

    UPDATE stock_uniformes
    SET quantite_stock = quantite_stock + v_distribution.quantite, updated_at = now()
    WHERE id = v_stock_old.id;

    -- 2) Déduire la nouvelle quantité de la nouvelle taille
    SELECT * INTO v_stock_new
    FROM stock_uniformes
    WHERE type_uniforme_id = v_distribution.type_uniforme_id
      AND annee_scolaire = v_distribution.annee_scolaire
      AND COALESCE(section, '') = COALESCE(v_distribution.section, '')
      AND taille = v_new_taille
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock non configuré pour % (taille %) et année %.',
        v_distribution.type_uniforme_libelle, v_new_taille, v_distribution.annee_scolaire;
    END IF;

    IF v_stock_new.quantite_stock < p_quantite THEN
      RAISE EXCEPTION 'Stock insuffisant pour % (taille %) : % disponible(s), % demandé(s).',
        v_distribution.type_uniforme_libelle, v_new_taille, v_stock_new.quantite_stock, p_quantite;
    END IF;

    UPDATE stock_uniformes
    SET quantite_stock = quantite_stock - p_quantite, updated_at = now()
    WHERE id = v_stock_new.id;
  END IF;

  -- Trace de l'échange éventuel dans les notes (visible dans l'interface)
  IF v_old_taille <> v_new_taille THEN
    v_echange_note := 'Échange taille ' || v_old_taille || ' → ' || v_new_taille
                      || ' le ' || to_char(now(), 'DD/MM/YYYY');
  END IF;

  IF v_echange_note IS NOT NULL THEN
    UPDATE gestion_uniformes
    SET taille = v_new_taille,
        quantite = p_quantite,
        notes = CASE
          WHEN notes IS NULL OR notes = '' THEN v_echange_note
          ELSE notes || E'\n' || v_echange_note
        END
    WHERE id = p_id;
  ELSE
    UPDATE gestion_uniformes
    SET taille = v_new_taille, quantite = p_quantite
    WHERE id = p_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trace d'audit : consigner toute création / modification / suppression de
-- distribution dans la table audit_logs (qui a fait quoi et quand).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_gestion_uniformes') THEN
    CREATE TRIGGER audit_gestion_uniformes
    AFTER INSERT OR UPDATE OR DELETE ON public.gestion_uniformes
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
  END IF;
END $$;
