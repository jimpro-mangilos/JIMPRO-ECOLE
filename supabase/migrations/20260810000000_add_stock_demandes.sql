-- Migration: 20260810000000_add_stock_demandes
-- Ajoute la table stock_demandes pour le workflow d'approvisionnement

CREATE TABLE IF NOT EXISTS stock_demandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES ecoles(id),
  type_uniforme_id uuid NOT NULL REFERENCES types_uniforme(id),
  annee_scolaire text DEFAULT '',
  section text DEFAULT '',
  quantite integer NOT NULL DEFAULT 0,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'approuve', 'rejete')),
  demandeur_id uuid,
  approbateur_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  date_approbation timestamptz
);

CREATE INDEX IF NOT EXISTS idx_stock_demandes_ecole ON stock_demandes(ecole_id);
CREATE INDEX IF NOT EXISTS idx_stock_demandes_statut ON stock_demandes(statut);

ALTER TABLE stock_demandes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_demandes_select" ON stock_demandes
  FOR SELECT USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

CREATE POLICY "stock_demandes_insert" ON stock_demandes
  FOR INSERT WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

CREATE POLICY "stock_demandes_update" ON stock_demandes
  FOR UPDATE USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);
