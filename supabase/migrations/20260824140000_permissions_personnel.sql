-- ============================================================
-- Pointage moderne :
--  · table permissions_personnel : demandes de permission soumises
--    à l'approbation (promoteur / it_manager / admin)
--  · les paramètres heure d'entrée/sortie sont stockés dans
--    app_settings (clés pointage_heure_entree / pointage_heure_sortie)
-- ============================================================

-- Approbateur des permissions : promoteur / it_manager / admin
CREATE OR REPLACE FUNCTION public.is_permission_approver()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid() AND r.nom IN ('promoteur', 'it_manager', 'admin')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_permission_approver() TO authenticated;

CREATE TABLE IF NOT EXISTS public.permissions_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  motif text,
  statut text NOT NULL DEFAULT 'en_attente',
  demande_par uuid REFERENCES auth.users(id),
  decide_par uuid REFERENCES auth.users(id),
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_permissions_ecole ON public.permissions_personnel (ecole_id);
CREATE INDEX IF NOT EXISTS idx_permissions_personnel ON public.permissions_personnel (personnel_id);
CREATE INDEX IF NOT EXISTS idx_permissions_statut ON public.permissions_personnel (statut);

ALTER TABLE public.permissions_personnel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissions_select" ON public.permissions_personnel;
CREATE POLICY "permissions_select" ON public.permissions_personnel FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "permissions_insert" ON public.permissions_personnel;
CREATE POLICY "permissions_insert" ON public.permissions_personnel FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- Seuls les approbateurs (promoteur / it_manager / admin) peuvent décider
DROP POLICY IF EXISTS "permissions_update" ON public.permissions_personnel;
CREATE POLICY "permissions_update" ON public.permissions_personnel FOR UPDATE TO authenticated
  USING ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_permission_approver())
  WITH CHECK ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND public.is_permission_approver());
