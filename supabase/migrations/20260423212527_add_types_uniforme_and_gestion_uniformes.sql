/*
  # Ajout des tables pour la gestion des uniformes

  ## Résumé
  Ce migration crée l'infrastructure nécessaire pour suivre la distribution des uniformes scolaires,
  liée au système de paiements existant.

  ## Nouvelles tables

  ### 1. `types_uniforme`
  Table de configuration des types d'articles vestimentaires.
  - `id` (uuid, primary key)
  - `libelle` (text, unique) — Nom de l'article (ex: Pull, EPS, Chemise)
  - `description` (text, nullable)
  - `is_active` (boolean, default true)
  - `ordre` (integer, default 0)

  ### 2. `gestion_uniformes`
  Historique des distributions d'uniformes par élève, lié aux paiements.
  - `eleve_id` (uuid, FK vers eleves)
  - `type_uniforme_id` (uuid, FK vers types_uniforme)
  - `paiement_id` (uuid, nullable, FK vers paiements)
  - Infos dénormalisées de l'élève et du comptable

  ## Données initiales
  - Types par défaut: Pull, EPS, Chemise, Pantalon, Cravate
  - Type de paiement "Uniformes" dans types_paiement

  ## Sécurité
  - RLS activé, politiques basées sur profiles JOIN roles
*/

-- =============================================
-- TABLE: types_uniforme
-- =============================================
CREATE TABLE IF NOT EXISTS types_uniforme (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  ordre integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE types_uniforme ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view types_uniforme"
  ON types_uniforme FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and IT managers can insert types_uniforme"
  ON types_uniforme FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

CREATE POLICY "Admins and IT managers can update types_uniforme"
  ON types_uniforme FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

CREATE POLICY "Admins and IT managers can delete types_uniforme"
  ON types_uniforme FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

-- Données initiales
INSERT INTO types_uniforme (libelle, description, ordre) VALUES
  ('Pull', 'Pull scolaire', 1),
  ('EPS', 'Équipement de sport', 2),
  ('Chemise', 'Chemise scolaire', 3),
  ('Pantalon', 'Pantalon scolaire', 4),
  ('Cravate', 'Cravate scolaire', 5)
ON CONFLICT (libelle) DO NOTHING;

-- =============================================
-- TABLE: gestion_uniformes
-- =============================================
CREATE TABLE IF NOT EXISTS gestion_uniformes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id uuid NOT NULL REFERENCES eleves(id) ON DELETE CASCADE,
  matricule text NOT NULL,
  nom_eleve text NOT NULL,
  postnom text DEFAULT '' NOT NULL,
  prenom text DEFAULT '' NOT NULL,
  section text DEFAULT '' NOT NULL,
  classe text DEFAULT '' NOT NULL,
  type_uniforme_id uuid REFERENCES types_uniforme(id) ON DELETE SET NULL,
  type_uniforme_libelle text NOT NULL,
  quantite integer DEFAULT 1 NOT NULL,
  annee_scolaire text,
  paiement_id uuid REFERENCES paiements(id) ON DELETE SET NULL,
  numero_recu text,
  notes text,
  comptable_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nom_comptable text DEFAULT '' NOT NULL,
  date_distribution timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE gestion_uniformes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view gestion_uniformes"
  ON gestion_uniformes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert gestion_uniformes"
  ON gestion_uniformes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager', 'secretaire', 'comptable', 'coordonnateur')
    )
  );

CREATE POLICY "Admins and IT managers can update gestion_uniformes"
  ON gestion_uniformes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

CREATE POLICY "Admins and IT managers can delete gestion_uniformes"
  ON gestion_uniformes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

CREATE INDEX IF NOT EXISTS idx_gestion_uniformes_eleve_id ON gestion_uniformes(eleve_id);
CREATE INDEX IF NOT EXISTS idx_gestion_uniformes_paiement_id ON gestion_uniformes(paiement_id);

-- =============================================
-- Ajout du type de paiement "Uniformes"
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM types_paiement WHERE libelle = 'Uniformes') THEN
    INSERT INTO types_paiement (libelle, description, is_active, ordre)
    VALUES ('Uniformes', 'Paiement pour les uniformes scolaires', true,
      (SELECT COALESCE(MAX(ordre), 0) + 1 FROM types_paiement));
  END IF;
END $$;
