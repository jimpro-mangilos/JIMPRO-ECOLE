/*
  # Création de la table classes

  1. Nouvelle table
    - `classes`
      - `id` (uuid, clé primaire)
      - `nom` (text, obligatoire) - Nom complet de la classe (ex: "5ème Scientifique A")
      - `section_id` (uuid, clé étrangère vers sections, obligatoire)
      - `option_id` (uuid, clé étrangère vers options, nullable)
      - `niveau` (text, nullable) - Niveau scolaire (ex: "5ème", "1ère")
      - `designation` (text, nullable) - Désignation de la classe (ex: "A", "B")
      - `description` (text, nullable)
      - `is_active` (boolean, par défaut true)
      - `ordre` (integer, par défaut 0) - Pour le tri
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Contraintes
    - Clé étrangère vers sections avec ON DELETE RESTRICT
    - Clé étrangère vers options avec ON DELETE RESTRICT
    - Index sur section_id et option_id pour optimiser les requêtes

  3. Triggers
    - Trigger pour mettre à jour automatiquement updated_at

  4. Sécurité
    - RLS activé sur la table
    - Politiques pour SELECT (tous authentifiés), INSERT/UPDATE/DELETE (admins uniquement)
*/

-- Créer la table classes
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  option_id uuid REFERENCES options(id) ON DELETE RESTRICT,
  niveau text,
  designation text,
  description text,
  is_active boolean DEFAULT true,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer les index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_classes_section_id ON classes(section_id);
CREATE INDEX IF NOT EXISTS idx_classes_option_id ON classes(option_id);
CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes(is_active);

-- Créer le trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_classes_updated_at ON classes;
CREATE TRIGGER trigger_update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_classes_updated_at();

-- Activer RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Politique SELECT: tous les utilisateurs authentifiés peuvent lire les classes
CREATE POLICY "Lecture des classes"
  ON classes
  FOR SELECT
  TO authenticated
  USING (true);

-- Politique INSERT: seuls les admins peuvent créer des classes
CREATE POLICY "Seuls les admins peuvent créer des classes"
  ON classes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom = 'admin'
    )
  );

-- Politique UPDATE: seuls les admins peuvent modifier des classes
CREATE POLICY "Seuls les admins peuvent modifier des classes"
  ON classes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom = 'admin'
    )
  );

-- Politique DELETE: seuls les admins peuvent supprimer des classes
CREATE POLICY "Seuls les admins peuvent supprimer des classes"
  ON classes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom = 'admin'
    )
  );