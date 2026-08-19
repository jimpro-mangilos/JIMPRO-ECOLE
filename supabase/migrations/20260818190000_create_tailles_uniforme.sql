-- Tailles d'uniformes configurables
CREATE TABLE IF NOT EXISTS public.tailles_uniforme (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  libelle text NOT NULL,
  ordre int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, libelle)
);
CREATE INDEX IF NOT EXISTS idx_tailles_uniforme_ecole ON public.tailles_uniforme (ecole_id);
ALTER TABLE public.tailles_uniforme ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['select','insert','update','delete'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tailles_uniforme_%s ON public.tailles_uniforme', t);
  END LOOP;
END $$;

CREATE POLICY "tailles_uniforme_select" ON public.tailles_uniforme FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);
CREATE POLICY "tailles_uniforme_insert" ON public.tailles_uniforme FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);
CREATE POLICY "tailles_uniforme_update" ON public.tailles_uniforme FOR UPDATE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);
CREATE POLICY "tailles_uniforme_delete" ON public.tailles_uniforme FOR DELETE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- Seed par défaut
INSERT INTO public.tailles_uniforme (ecole_id, libelle, ordre)
SELECT e.id, t.libelle, t.ordre
FROM public.ecoles e
CROSS JOIN (VALUES ('XS',1),('S',2),('M',3),('L',4),('XL',5),('XXL',6)) AS t(libelle, ordre)
ON CONFLICT (ecole_id, libelle) DO NOTHING;
