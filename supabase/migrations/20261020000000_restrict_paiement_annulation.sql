-- ============================================================
-- Annulation des paiements : approbation hiérarchique
-- ============================================================
-- Règle :
--   * L'annulation DIRECTE d'un paiement (statut → 'annule') est
--     réservée à la hiérarchie : promoteur, it_manager, admin.
--   * Le comptable ne peut plus annuler directement : il soumet une
--     DEMANDE d'annulation, qui doit être approuvée par la hiérarchie
--     avant que le paiement soit effectivement annulé.
-- ============================================================

-- 1. Approbateurs de l'annulation (hiérarchie)
CREATE OR REPLACE FUNCTION public.is_paiement_cancel_approver()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND r.nom IN ('promoteur', 'it_manager', 'admin')
  );
$$;

-- 2. Annulation directe (hiérarchie uniquement)
CREATE OR REPLACE FUNCTION public.annuler_paiement(p_id uuid, p_motif text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_statut text;
  v_annuleur text;
BEGIN
  IF NOT public.is_paiement_cancel_approver() THEN
    RAISE EXCEPTION 'Annulation refusée : approbation hiérarchique requise (promoteur, it_manager ou admin).';
  END IF;

  IF p_motif IS NULL OR btrim(p_motif) = '' THEN
    RAISE EXCEPTION 'Le motif d''annulation est requis.';
  END IF;

  SELECT statut INTO v_statut FROM public.paiements WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paiement introuvable.';
  END IF;

  IF v_statut = 'annule' THEN
    RAISE EXCEPTION 'Ce paiement est déjà annulé.';
  END IF;

  SELECT COALESCE(p.prenom || ' ' || p.nom, '') INTO v_annuleur
  FROM public.profiles p
  WHERE p.id = auth.uid();

  UPDATE public.paiements
  SET statut = 'annule',
      motif_annulation = btrim(p_motif),
      annule_par = auth.uid(),
      nom_annuleur = v_annuleur,
      date_annulation = now()
  WHERE id = p_id;
END;
$$;

-- 3. Garde-fou : bloque toute annulation directe (UPDATE vers 'annule')
--    par un rôle non approbateur. Le comptable conserve l'encaissement
--    et la modification de ses autres champs.
CREATE OR REPLACE FUNCTION public.restrict_paiement_annulation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'annule' AND OLD.statut IS DISTINCT FROM 'annule' THEN
    -- auth.uid() NULL = service_role / migrations → autorisé
    IF auth.uid() IS NOT NULL AND NOT public.is_paiement_cancel_approver() THEN
      RAISE EXCEPTION 'Annulation refusée : approbation hiérarchique requise (promoteur, it_manager ou admin).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_paiements_restrict_annulation ON public.paiements;
CREATE TRIGGER trg_paiements_restrict_annulation
BEFORE UPDATE ON public.paiements
FOR EACH ROW
EXECUTE FUNCTION public.restrict_paiement_annulation();

-- 4. Table des demandes d'annulation
CREATE TABLE IF NOT EXISTS public.demandes_annulation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  paiement_id uuid NOT NULL REFERENCES public.paiements(id) ON DELETE CASCADE,
  motif text NOT NULL,
  statut text NOT NULL DEFAULT 'en_attente',
  demandeur_id uuid REFERENCES auth.users(id),
  demandeur_nom text,
  approuveur_id uuid REFERENCES auth.users(id),
  approuveur_nom text,
  date_demande timestamptz NOT NULL DEFAULT now(),
  date_decision timestamptz,
  motif_refus text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT demandes_annulation_statut_check CHECK (statut IN ('en_attente', 'approuvee', 'refusee'))
);

CREATE INDEX IF NOT EXISTS idx_demandes_annulation_ecole ON public.demandes_annulation (ecole_id);
CREATE INDEX IF NOT EXISTS idx_demandes_annulation_statut ON public.demandes_annulation (statut);
CREATE INDEX IF NOT EXISTS idx_demandes_annulation_paiement ON public.demandes_annulation (paiement_id);

ALTER TABLE public.demandes_annulation ENABLE ROW LEVEL SECURITY;

-- 5. Politiques RLS de demandes_annulation
DROP POLICY IF EXISTS "demandes_annulation_select" ON public.demandes_annulation;
CREATE POLICY "demandes_annulation_select" ON public.demandes_annulation FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "demandes_annulation_insert" ON public.demandes_annulation;
CREATE POLICY "demandes_annulation_insert" ON public.demandes_annulation FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "demandes_annulation_update" ON public.demandes_annulation;
CREATE POLICY "demandes_annulation_update" ON public.demandes_annulation FOR UPDATE TO authenticated
  USING ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_paiement_cancel_approver())
  WITH CHECK ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_paiement_cancel_approver());

DROP POLICY IF EXISTS "demandes_annulation_delete" ON public.demandes_annulation;
CREATE POLICY "demandes_annulation_delete" ON public.demandes_annulation FOR DELETE TO authenticated
  USING ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_paiement_cancel_approver());

-- 6. Demander une annulation (le comptable) → crée une demande en_attente
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
  -- Seul le comptable (rôle strict) soumet une demande ; la hiérarchie
  -- annule directement via annuler_paiement().
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

-- 7. Traiter une demande (approbateur) : approuve (annule le paiement)
--    ou refuse.
CREATE OR REPLACE FUNCTION public.traiter_demande_annulation(p_demande_id uuid, p_decision text, p_motif_refus text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_demande public.demandes_annulation%ROWTYPE;
  v_approbateur text;
BEGIN
  IF NOT public.is_paiement_cancel_approver() THEN
    RAISE EXCEPTION 'Annulation refusée : approbation hiérarchique requise (promoteur, it_manager ou admin).';
  END IF;

  IF p_decision NOT IN ('approuvee', 'refusee') THEN
    RAISE EXCEPTION 'Décision invalide.';
  END IF;

  SELECT * INTO v_demande FROM public.demandes_annulation WHERE id = p_demande_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande introuvable.';
  END IF;

  IF v_demande.statut <> 'en_attente' THEN
    RAISE EXCEPTION 'Cette demande a déjà été traitée.';
  END IF;

  SELECT COALESCE(p.prenom || ' ' || p.nom, '') INTO v_approbateur
  FROM public.profiles p WHERE p.id = auth.uid();

  IF p_decision = 'approuvee' THEN
    -- Annuler effectivement le paiement
    UPDATE public.paiements
    SET statut = 'annule',
        motif_annulation = v_demande.motif,
        annule_par = auth.uid(),
        nom_annuleur = v_approbateur,
        date_annulation = now()
    WHERE id = v_demande.paiement_id
      AND statut IS DISTINCT FROM 'annule';

    UPDATE public.demandes_annulation
    SET statut = 'approuvee',
        approuveur_id = auth.uid(),
        approuveur_nom = v_approbateur,
        date_decision = now()
    WHERE id = p_demande_id;
  ELSE
    UPDATE public.demandes_annulation
    SET statut = 'refusee',
        motif_refus = btrim(COALESCE(p_motif_refus, '')),
        approuveur_id = auth.uid(),
        approuveur_nom = v_approbateur,
        date_decision = now()
    WHERE id = p_demande_id;
  END IF;
END;
$$;

-- 8. Permissions d'exécution
REVOKE EXECUTE ON FUNCTION public.annuler_paiement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.annuler_paiement(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_paiement_cancel_approver() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_paiement_cancel_approver() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.demander_annulation_paiement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.demander_annulation_paiement(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.traiter_demande_annulation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.traiter_demande_annulation(uuid, text, text) TO authenticated;
