/*
  # Extension JIMPRO - Authentification, Rôles et Configuration

  ## Description
  Cette migration ajoute le système d'authentification, la gestion des rôles et la configuration des sections/options.

  ## 1. Nouvelles Tables

  ### `profiles` - Profils utilisateurs
  - `id` (uuid, clé primaire, lié à auth.users)
  - `email` (text) - Email de l'utilisateur
  - `nom` (text) - Nom de famille
  - `prenom` (text) - Prénom
  - `role_id` (uuid) - Référence au rôle
  - `photo_url` (text) - URL de la photo de profil
  - `last_login` (timestamptz) - Dernière connexion
  - `is_active` (boolean) - Compte actif ou désactivé
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `roles` - Rôles et permissions
  - `id` (uuid, clé primaire)
  - `nom` (text) - Nom du rôle (admin, directeur, secretaire, comptable)
  - `description` (text) - Description du rôle
  - `permissions` (jsonb) - Permissions associées
  - `created_at` (timestamptz)

  ### `sections` - Sections scolaires
  - `id` (uuid, clé primaire)
  - `nom` (text) - Nom de la section (ex: Primaire, Secondaire)
  - `description` (text) - Description
  - `is_active` (boolean) - Section active ou non
  - `ordre` (integer) - Ordre d'affichage
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `options` - Options d'études
  - `id` (uuid, clé primaire)
  - `nom` (text) - Nom de l'option (ex: Math-Physique, Littéraire)
  - `section_id` (uuid) - Référence à la section
  - `description` (text) - Description
  - `is_active` (boolean) - Option active ou non
  - `ordre` (integer) - Ordre d'affichage
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `user_activity_logs` - Logs d'activité
  - `id` (uuid, clé primaire)
  - `user_id` (uuid) - Référence au profil utilisateur
  - `action` (text) - Type d'action effectuée
  - `details` (jsonb) - Détails de l'action
  - `created_at` (timestamptz)

  ## 2. Sécurité
  - Activation de RLS sur toutes les nouvelles tables
  - Politiques restrictives basées sur l'authentification et les rôles
  - Les utilisateurs authentifiés peuvent voir leur propre profil
  - Seuls les admins peuvent gérer les utilisateurs et les rôles
  - Les sections et options sont visibles par tous les utilisateurs authentifiés
  - Les logs sont accessibles uniquement aux admins

  ## 3. Données Initiales
  - Création des 4 rôles de base
  - Création de sections et options par défaut

  ## 4. Notes Importantes
  - Les anciennes politiques RLS trop permissives seront remplacées
  - L'accès aux données sera désormais basé sur les rôles
*/

-- Table ROLES
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text UNIQUE NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Table PROFILES (liée à auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  role_id uuid REFERENCES roles(id),
  photo_url text,
  last_login timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table SECTIONS
CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table OPTIONS
CREATE TABLE IF NOT EXISTS options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
  description text,
  is_active boolean DEFAULT true,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(nom, section_id)
);

-- Table USER_ACTIVITY_LOGS
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Création des index
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_options_section_id ON options(section_id);
CREATE INDEX IF NOT EXISTS idx_sections_is_active ON sections(is_active);
CREATE INDEX IF NOT EXISTS idx_options_is_active ON options(is_active);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- Insertion des rôles par défaut
INSERT INTO roles (nom, description, permissions) VALUES
  ('admin', 'Administrateur système - Accès complet', '{"all": true}'::jsonb),
  ('directeur', 'Directeur - Accès aux rapports et supervision', '{"rapports": true, "eleves": true, "finances": true, "minerval": true, "fournitures": true}'::jsonb),
  ('secretaire', 'Secrétaire - Gestion des élèves et minerval', '{"eleves": true, "minerval": true, "fournitures": true}'::jsonb),
  ('comptable', 'Comptable - Gestion financière', '{"finances": true, "minerval": true, "rapports": true}'::jsonb)
ON CONFLICT (nom) DO NOTHING;

-- Insertion des sections par défaut
INSERT INTO sections (nom, description, ordre) VALUES
  ('Maternelle', 'Section Maternelle', 1),
  ('Primaire', 'Section Primaire', 2),
  ('Secondaire', 'Section Secondaire', 3)
ON CONFLICT (nom) DO NOTHING;

-- Insertion des options par défaut pour le Secondaire
INSERT INTO options (nom, section_id, description, ordre)
SELECT 'Générale', id, 'Option Générale', 1 FROM sections WHERE nom = 'Secondaire'
ON CONFLICT DO NOTHING;

INSERT INTO options (nom, section_id, description, ordre)
SELECT 'Math-Physique', id, 'Option Mathématiques et Physique', 2 FROM sections WHERE nom = 'Secondaire'
ON CONFLICT DO NOTHING;

INSERT INTO options (nom, section_id, description, ordre)
SELECT 'Littéraire', id, 'Option Littéraire', 3 FROM sections WHERE nom = 'Secondaire'
ON CONFLICT DO NOTHING;

INSERT INTO options (nom, section_id, description, ordre)
SELECT 'Commerciale', id, 'Option Commerciale et Gestion', 4 FROM sections WHERE nom = 'Secondaire'
ON CONFLICT DO NOTHING;

-- Activation de Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour ROLES
CREATE POLICY "Utilisateurs authentifiés peuvent voir les rôles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Seuls les admins peuvent gérer les rôles"
  ON roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE nom = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (SELECT id FROM roles WHERE nom = 'admin')
    )
  );

-- Politiques RLS pour PROFILES
CREATE POLICY "Utilisateurs peuvent voir leur propre profil"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins peuvent voir tous les profils"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

CREATE POLICY "Utilisateurs peuvent mettre à jour leur propre profil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins peuvent gérer tous les profils"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

-- Politiques RLS pour SECTIONS
CREATE POLICY "Utilisateurs authentifiés peuvent voir les sections"
  ON sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Seuls les admins peuvent gérer les sections"
  ON sections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

CREATE POLICY "Seuls les admins peuvent modifier les sections"
  ON sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

CREATE POLICY "Seuls les admins peuvent supprimer les sections"
  ON sections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

-- Politiques RLS pour OPTIONS
CREATE POLICY "Utilisateurs authentifiés peuvent voir les options"
  ON options FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Seuls les admins peuvent gérer les options"
  ON options FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

CREATE POLICY "Seuls les admins peuvent modifier les options"
  ON options FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

CREATE POLICY "Seuls les admins peuvent supprimer les options"
  ON options FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

-- Politiques RLS pour USER_ACTIVITY_LOGS
CREATE POLICY "Seuls les admins peuvent voir les logs"
  ON user_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

CREATE POLICY "Système peut créer des logs"
  ON user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Mise à jour des politiques existantes pour les tables principales
-- Suppression des anciennes politiques trop permissives
DROP POLICY IF EXISTS "Permettre tout accès à eleves" ON eleves;
DROP POLICY IF EXISTS "Permettre tout accès à minerval" ON minerval;
DROP POLICY IF EXISTS "Permettre tout accès à compte_courant" ON compte_courant;
DROP POLICY IF EXISTS "Permettre tout accès à gestion_fournitures" ON gestion_fournitures;
DROP POLICY IF EXISTS "Permettre tout accès à gestion_fourniture_bureau" ON gestion_fourniture_bureau;

-- Nouvelles politiques basées sur l'authentification
CREATE POLICY "Utilisateurs authentifiés peuvent voir les élèves"
  ON eleves FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Secrétaires et admins peuvent gérer les élèves"
  ON eleves FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'secretaire', 'directeur')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'secretaire', 'directeur')
    )
  );

CREATE POLICY "Utilisateurs authentifiés peuvent voir le minerval"
  ON minerval FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Secrétaires et comptables peuvent gérer le minerval"
  ON minerval FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'secretaire', 'comptable', 'directeur')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'secretaire', 'comptable', 'directeur')
    )
  );

CREATE POLICY "Utilisateurs authentifiés peuvent voir le compte courant"
  ON compte_courant FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Comptables et admins peuvent gérer le compte courant"
  ON compte_courant FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'comptable', 'directeur')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'comptable', 'directeur')
    )
  );

CREATE POLICY "Utilisateurs authentifiés peuvent voir les fournitures élèves"
  ON gestion_fournitures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Secrétaires et admins peuvent gérer les fournitures élèves"
  ON gestion_fournitures FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'secretaire', 'directeur')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'secretaire', 'directeur')
    )
  );

CREATE POLICY "Utilisateurs authentifiés peuvent voir les fournitures bureau"
  ON gestion_fourniture_bureau FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Utilisateurs authentifiés peuvent gérer les fournitures bureau"
  ON gestion_fourniture_bureau FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'secretaire', 'comptable', 'directeur')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'secretaire', 'comptable', 'directeur')
    )
  );

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    (SELECT id FROM roles WHERE nom = 'secretaire' LIMIT 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement un profil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sections_updated_at ON sections;
CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_options_updated_at ON options;
CREATE TRIGGER update_options_updated_at
  BEFORE UPDATE ON options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();