-- ============================================================
-- Performance : index composites pour les pages à gros volume
-- (paiements, distributions d'uniformes, élèves)
-- Ces requêtes filtrent par ecole_id et trient par date → l'index
-- composite évite le tri de milliers de lignes à chaque ouverture.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_paiements_ecole_created_at
  ON public.paiements (ecole_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gestion_uniformes_ecole_date
  ON public.gestion_uniformes (ecole_id, date_distribution DESC);

CREATE INDEX IF NOT EXISTS idx_eleves_ecole_created_at
  ON public.eleves (ecole_id, created_at DESC);
