-- ============================================================
-- Historique des mouvements de stock (approvisionnement)
-- ============================================================
-- Journalise chaque entrée/sortie de stock : approvisionnement
-- manuel, réception d'une demande, correction et suppression.
-- Permet de consulter l'historique "ensemble" (toutes catégories)
-- ou "par catégorie" (article) depuis la page Stock Uniformes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.historique_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  type_uniforme_id uuid REFERENCES public.types_uniforme(id) ON DELETE SET NULL,
  type_uniforme_libelle text NOT NULL DEFAULT '',
  annee_scolaire text,
  section text,
  taille text DEFAULT 'M',
  quantite integer NOT NULL DEFAULT 0,
  type_operation text NOT NULL DEFAULT 'approvisionnement',
  nom_utilisateur text,
  utilisateur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historique_stock_ecole ON public.historique_stock (ecole_id);
CREATE INDEX IF NOT EXISTS idx_historique_stock_article ON public.historique_stock (type_uniforme_id);
CREATE INDEX IF NOT EXISTS idx_historique_stock_created ON public.historique_stock (created_at DESC);

ALTER TABLE public.historique_stock ENABLE ROW LEVEL SECURITY;

-- Lecture : membres de l'école courante (ou admin/it_manager/promoteur en contournement)
CREATE POLICY "historique_stock_select" ON public.historique_stock FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- Insertion : membres de l'école courante (journal applicatif, append-only)
CREATE POLICY "historique_stock_insert" ON public.historique_stock FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);
