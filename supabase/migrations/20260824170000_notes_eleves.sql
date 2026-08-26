-- ============================================================
-- Notes des élèves par devoir (bulletin de notes)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notes_eleves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id uuid NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  devoir_id uuid NOT NULL REFERENCES public.devoirs(id) ON DELETE CASCADE,
  note numeric(5, 2),
  appreciation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (eleve_id, devoir_id)
);

CREATE INDEX IF NOT EXISTS idx_notes_eleves_ecole ON public.notes_eleves (ecole_id);
CREATE INDEX IF NOT EXISTS idx_notes_eleves_eleve ON public.notes_eleves (eleve_id);
CREATE INDEX IF NOT EXISTS idx_notes_eleves_devoir ON public.notes_eleves (devoir_id);

ALTER TABLE public.notes_eleves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_eleves_select" ON public.notes_eleves;
CREATE POLICY "notes_eleves_select" ON public.notes_eleves FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "notes_eleves_insert" ON public.notes_eleves;
CREATE POLICY "notes_eleves_insert" ON public.notes_eleves FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "notes_eleves_update" ON public.notes_eleves;
CREATE POLICY "notes_eleves_update" ON public.notes_eleves FOR UPDATE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "notes_eleves_delete" ON public.notes_eleves;
CREATE POLICY "notes_eleves_delete" ON public.notes_eleves FOR DELETE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);
