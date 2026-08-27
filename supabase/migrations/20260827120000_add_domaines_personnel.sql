-- ============================================================
-- Configuration Personnel : table des DOMAINES d'activité
-- (même modèle que fonctions_personnel) + pré-remplissage par défaut
-- pour chaque école (les écoles peuvent ensuite les adapter dans
-- Configuration → Personnel).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.domaines_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  libelle text NOT NULL,
  ordre int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_domaines_personnel_ecole ON public.domaines_personnel (ecole_id);

ALTER TABLE public.domaines_personnel ENABLE ROW LEVEL SECURITY;

-- RLS tenant-scoped (avec bypass admin via get_current_ecole_id() IS NULL)
DO $$
DECLARE
  t text := 'domaines_personnel';
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS %I_select ON public.%I', t, t);
  EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT TO authenticated USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)', t, t);

  EXECUTE format('DROP POLICY IF EXISTS %I_insert ON public.%I', t, t);
  EXECUTE format('CREATE POLICY %I_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)', t, t);

  EXECUTE format('DROP POLICY IF EXISTS %I_update ON public.%I', t, t);
  EXECUTE format('CREATE POLICY %I_update ON public.%I FOR UPDATE TO authenticated USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)', t, t);

  EXECUTE format('DROP POLICY IF EXISTS %I_delete ON public.%I', t, t);
  EXECUTE format('CREATE POLICY %I_delete ON public.%I FOR DELETE TO authenticated USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)', t, t);
END $$;

-- Pré-remplissage des domaines par défaut pour chaque école
INSERT INTO public.domaines_personnel (ecole_id, libelle, ordre)
SELECT e.id, d.libelle, d.ordre
FROM public.ecoles e
CROSS JOIN (
  VALUES
    ('Enseignement', 1),
    ('Administration', 2),
    ('Comptabilité', 3),
    ('Technique / Maintenance', 4),
    ('Santé', 5),
    ('Sécurité', 6),
    ('Transport', 7),
    ('Cuisine', 8),
    ('Bibliothèque', 9),
    ('Autre', 10)
) AS d(libelle, ordre)
WHERE NOT EXISTS (
  SELECT 1 FROM public.domaines_personnel dp WHERE dp.ecole_id = e.id AND dp.libelle = d.libelle
);

-- Pré-remplissage des fonctions par défaut pour les écoles qui n'en ont aucune
INSERT INTO public.fonctions_personnel (ecole_id, libelle, ordre)
SELECT e.id, f.libelle, f.ordre
FROM public.ecoles e
CROSS JOIN (
  VALUES
    ('Enseignant', 1),
    ('Directeur', 2),
    ('Directeur adjoint', 3),
    ('Coordonnateur', 4),
    ('Comptable', 5),
    ('Secrétaire', 6),
    ('Surveillant', 7),
    ('Gardien', 8),
    ('Bibliothécaire', 9),
    ('Infirmier', 10),
    ('Autre', 11)
) AS f(libelle, ordre)
WHERE NOT EXISTS (
  SELECT 1 FROM public.fonctions_personnel fp WHERE fp.ecole_id = e.id
)
ON CONFLICT DO NOTHING;
