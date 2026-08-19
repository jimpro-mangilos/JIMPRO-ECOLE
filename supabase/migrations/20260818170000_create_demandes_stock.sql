-- ============================================================
-- Demandes d'entrée en stock (uniformes) avec approbation
-- Rôles approbateurs : promoteur, it_manager, admin
-- ============================================================

CREATE TABLE IF NOT EXISTS public.demandes_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  type_uniforme_id uuid NOT NULL REFERENCES public.types_uniforme(id) ON DELETE CASCADE,
  annee_scolaire text NOT NULL,
  section text,
  quantite int NOT NULL,
  seuil_alerte int,
  notes text,
  statut text NOT NULL DEFAULT 'en_attente',
  demandeur_id uuid REFERENCES auth.users(id),
  demandeur_nom text,
  approuveur_id uuid REFERENCES auth.users(id),
  approuveur_nom text,
  date_demande timestamptz NOT NULL DEFAULT now(),
  date_decision timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demandes_stock_ecole ON public.demandes_stock (ecole_id);
CREATE INDEX IF NOT EXISTS idx_demandes_stock_statut ON public.demandes_stock (statut);

ALTER TABLE public.demandes_stock ENABLE ROW LEVEL SECURITY;

-- Fonction : vrai si l'utilisateur courant est promoteur / it_manager / admin
CREATE OR REPLACE FUNCTION public.is_stock_approver()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid() AND r.nom IN ('promoteur', 'it_manager', 'admin')
  );
$$;

DROP POLICY IF EXISTS "demandes_stock_select" ON public.demandes_stock;
CREATE POLICY "demandes_stock_select" ON public.demandes_stock FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "demandes_stock_insert" ON public.demandes_stock;
CREATE POLICY "demandes_stock_insert" ON public.demandes_stock FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- Seuls les approbateurs (promoteur/it_manager/admin) peuvent décider
DROP POLICY IF EXISTS "demandes_stock_update" ON public.demandes_stock;
CREATE POLICY "demandes_stock_update" ON public.demandes_stock FOR UPDATE TO authenticated
  USING ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_stock_approver())
  WITH CHECK ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_stock_approver());

DROP POLICY IF EXISTS "demandes_stock_delete" ON public.demandes_stock;
CREATE POLICY "demandes_stock_delete" ON public.demandes_stock FOR DELETE TO authenticated
  USING ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_stock_approver());
