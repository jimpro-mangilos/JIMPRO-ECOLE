-- ============================================================
-- Configuration Personnel : Fonctions + Niveaux d'étude
-- (le préfixe matricule personnel est stocké dans app_settings,
--  clé 'personnel_matricule_prefix')
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fonctions_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  libelle text NOT NULL,
  ordre int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fonctions_personnel_ecole ON public.fonctions_personnel (ecole_id);

CREATE TABLE IF NOT EXISTS public.niveaux_etude (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  libelle text NOT NULL,
  ordre int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_niveaux_etude_ecole ON public.niveaux_etude (ecole_id);

ALTER TABLE public.fonctions_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niveaux_etude ENABLE ROW LEVEL SECURITY;

-- RLS tenant-scoped (avec bypass admin via get_current_ecole_id() IS NULL)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fonctions_personnel', 'niveaux_etude'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE TO authenticated USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE TO authenticated USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)', t, t);
  END LOOP;
END $$;
