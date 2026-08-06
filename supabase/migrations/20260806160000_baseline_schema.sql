-- ============================================================
-- JIMPRO-ECOLE Baseline Schema (squashed from 57 migrations)
-- Generated: 2026-08-06
-- ============================================================


-- >>> 20260402145004_create_jimpro_school_tables.sql
/*
  # Création des tables pour JIMPRO - Système de Gestion Scolaire

  ## Description
  Cette migration crée les 5 tables principales pour le système de gestion scolaire JIMPRO.

  ## 1. Nouvelles Tables
  
  ### `eleves` - Gestion des élèves
  - `id` (uuid, clé primaire)
  - `matricule` (text, unique) - Numéro d'identification unique de l'élève
  - `nom` (text) - Nom de famille
  - `postnom` (text) - Second nom
  - `prenom` (text) - Prénom
  - `sexe` (text) - Sexe de l'élève (M/F)
  - `lieu_naissance` (text) - Lieu de naissance
  - `date_naissance` (date) - Date de naissance
  - `section` (text) - Section scolaire
  - `option` (text) - Option d'études
  - `responsable` (text) - Nom du parent/tuteur
  - `telephone` (text) - Numéro de téléphone
  - `domicile` (text) - Adresse du domicile
  - `created_at` (timestamptz) - Date de création
  - `updated_at` (timestamptz) - Date de dernière modification

  ### `minerval` - Gestion des frais scolaires
  - `id` (uuid, clé primaire)
  - `matricule` (text) - Référence à l'élève
  - `nom` (text)
  - `postnom` (text)
  - `prenom` (text)
  - `sexe` (text)
  - `lieu_naissance` (text)
  - `date_naissance` (date)
  - `section` (text)
  - `option` (text)
  - `responsable` (text)
  - `telephone` (text)
  - `domicile` (text)
  - `montant_total` (numeric) - Montant total des frais
  - `montant_paye` (numeric) - Montant déjà payé
  - `date_paiement` (timestamptz) - Date du paiement
  - `methode_paiement` (text) - Mode de paiement (Cash, Mobile Money, etc.)
  - `numero_recu` (text) - Numéro de reçu
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `compte_courant` - Gestion financière
  - `id` (uuid, clé primaire)
  - `montant_chiffre` (numeric) - Montant en chiffres
  - `montant_lettre` (text) - Montant en lettres
  - `beneficiaire` (text) - Bénéficiaire de la transaction
  - `libelle` (text) - Description de la transaction
  - `telephone` (text) - Téléphone du bénéficiaire
  - `type_operation` (text) - Type: 'recette' ou 'dépense'
  - `date_transaction` (timestamptz) - Date de la transaction
  - `created_at` (timestamptz)

  ### `gestion_fournitures` - Gestion fournitures élèves
  - `id` (uuid, clé primaire)
  - `matricule` (text) - Référence à l'élève
  - `nom` (text)
  - `postnom` (text)
  - `prenom` (text)
  - `sexe` (text)
  - `lieu_naissance` (text)
  - `date_naissance` (date)
  - `section` (text)
  - `option` (text)
  - `annee` (text) - Année scolaire
  - `eps` (boolean) - Équipement de sport distribué
  - `pull` (boolean) - Pull distribué
  - `date_distribution` (timestamptz) - Date de distribution
  - `created_at` (timestamptz)

  ### `gestion_fourniture_bureau` - Gestion fournitures bureau
  - `id` (uuid, clé primaire)
  - `article` (text) - Nom de l'article
  - `beneficiaire` (text) - Personne ayant reçu l'article
  - `commentaire` (text) - Commentaire ou notes
  - `quantite` (integer) - Quantité distribuée
  - `date_operation` (timestamptz) - Date de l'opération
  - `created_at` (timestamptz)

  ## 2. Sécurité
  - Activation de Row Level Security (RLS) sur toutes les tables
  - Politiques permettant l'accès complet pour les utilisateurs authentifiés
  - Les tables sont verrouillées par défaut sans politiques

  ## 3. Index
  - Index sur matricule pour recherches rapides
  - Index sur nom pour tri et recherche
  - Index sur section pour filtrage
  - Index sur dates pour rapports temporels
*/

-- Table ELEVES
CREATE TABLE IF NOT EXISTS eleves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule text UNIQUE NOT NULL,
  nom text NOT NULL,
  postnom text NOT NULL,
  prenom text NOT NULL,
  sexe text NOT NULL,
  lieu_naissance text NOT NULL,
  date_naissance date NOT NULL,
  section text NOT NULL,
  option text,
  responsable text NOT NULL,
  telephone text NOT NULL,
  domicile text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table MINERVAL
CREATE TABLE IF NOT EXISTS minerval (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule text NOT NULL,
  nom text NOT NULL,
  postnom text NOT NULL,
  prenom text NOT NULL,
  sexe text NOT NULL,
  lieu_naissance text NOT NULL,
  date_naissance date NOT NULL,
  section text NOT NULL,
  option text,
  responsable text NOT NULL,
  telephone text NOT NULL,
  domicile text NOT NULL,
  montant_total numeric DEFAULT 0,
  montant_paye numeric DEFAULT 0,
  date_paiement timestamptz DEFAULT now(),
  methode_paiement text DEFAULT 'Cash',
  numero_recu text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table COMPTE_COURANT
CREATE TABLE IF NOT EXISTS compte_courant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  montant_chiffre numeric NOT NULL,
  montant_lettre text NOT NULL,
  beneficiaire text NOT NULL,
  libelle text NOT NULL,
  telephone text,
  type_operation text NOT NULL CHECK (type_operation IN ('recette', 'dépense')),
  date_transaction timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Table GESTION_FOURNITURES
CREATE TABLE IF NOT EXISTS gestion_fournitures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule text NOT NULL,
  nom text NOT NULL,
  postnom text NOT NULL,
  prenom text NOT NULL,
  sexe text NOT NULL,
  lieu_naissance text NOT NULL,
  date_naissance date NOT NULL,
  section text NOT NULL,
  option text,
  annee text NOT NULL,
  eps boolean DEFAULT false,
  pull boolean DEFAULT false,
  date_distribution timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Table GESTION_FOURNITURE_BUREAU
CREATE TABLE IF NOT EXISTS gestion_fourniture_bureau (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article text NOT NULL,
  beneficiaire text NOT NULL,
  commentaire text,
  quantite integer DEFAULT 1,
  date_operation timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Création des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_eleves_matricule ON eleves(matricule);
CREATE INDEX IF NOT EXISTS idx_eleves_nom ON eleves(nom);
CREATE INDEX IF NOT EXISTS idx_eleves_section ON eleves(section);
CREATE INDEX IF NOT EXISTS idx_eleves_created_at ON eleves(created_at);

CREATE INDEX IF NOT EXISTS idx_minerval_matricule ON minerval(matricule);
CREATE INDEX IF NOT EXISTS idx_minerval_date_paiement ON minerval(date_paiement);

CREATE INDEX IF NOT EXISTS idx_compte_courant_date ON compte_courant(date_transaction);
CREATE INDEX IF NOT EXISTS idx_compte_courant_type ON compte_courant(type_operation);

CREATE INDEX IF NOT EXISTS idx_fournitures_matricule ON gestion_fournitures(matricule);
CREATE INDEX IF NOT EXISTS idx_fournitures_section ON gestion_fournitures(section);

CREATE INDEX IF NOT EXISTS idx_fourniture_bureau_date ON gestion_fourniture_bureau(date_operation);

-- Activation de Row Level Security
ALTER TABLE eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE minerval ENABLE ROW LEVEL SECURITY;
ALTER TABLE compte_courant ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestion_fournitures ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestion_fourniture_bureau ENABLE ROW LEVEL SECURITY;

-- Politiques RLS permettant l'accès complet (à adapter selon besoins d'authentification)
CREATE POLICY "Permettre tout accès à eleves" ON eleves FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permettre tout accès à minerval" ON minerval FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permettre tout accès à compte_courant" ON compte_courant FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permettre tout accès à gestion_fournitures" ON gestion_fournitures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permettre tout accès à gestion_fourniture_bureau" ON gestion_fourniture_bureau FOR ALL USING (true) WITH CHECK (true);
-- >>> 20260402153441_add_authentication_roles_and_configuration.sql
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
-- >>> 20260402155659_fix_user_signup_trigger.sql
/*
  # Correction du trigger de création de profil utilisateur

  ## Description
  Ce correctif résout l'erreur lors de la création de compte en améliorant
  la fonction `handle_new_user()` pour mieux gérer les métadonnées utilisateur.

  ## Problème résolu
  - Le trigger ne récupérait pas correctement les champs `nom` et `prenom` 
    depuis `raw_user_meta_data`
  - Les valeurs vides causaient des erreurs lors de l'insertion dans `profiles`

  ## Solution
  - Amélioration de la récupération des métadonnées avec vérification stricte
  - Ajout de valeurs par défaut plus robustes
  - Meilleure gestion des erreurs

  ## Modifications
  1. Suppression de l'ancien trigger et fonction
  2. Création d'une nouvelle fonction améliorée
  3. Recréation du trigger
*/

-- Suppression de l'ancien trigger et fonction
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Nouvelle fonction améliorée pour créer automatiquement un profil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_nom text;
  v_prenom text;
  v_default_role_id uuid;
BEGIN
  -- Récupération du rôle par défaut (secretaire)
  SELECT id INTO v_default_role_id 
  FROM public.roles 
  WHERE nom = 'secretaire' 
  LIMIT 1;

  -- Récupération des métadonnées avec valeurs par défaut
  v_nom := COALESCE(
    NEW.raw_user_meta_data->>'nom',
    split_part(NEW.email, '@', 1)
  );
  
  v_prenom := COALESCE(
    NEW.raw_user_meta_data->>'prenom',
    ''
  );

  -- Insertion du profil
  INSERT INTO public.profiles (
    id,
    email,
    nom,
    prenom,
    role_id,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_nom,
    v_prenom,
    v_default_role_id,
    true
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, on log mais on ne bloque pas la création du compte
    RAISE WARNING 'Erreur lors de la création du profil pour %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recréation du trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Commentaire sur la fonction
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Crée automatiquement un profil utilisateur lors de l''inscription avec gestion robuste des métadonnées';

-- >>> 20260402160428_fix_rls_infinite_recursion.sql
/*
  # Correction de la récursion infinie dans les politiques RLS

  ## Description
  Ce correctif résout l'erreur "infinite recursion detected in policy" qui empêche
  la connexion des utilisateurs. Le problème venait de politiques RLS circulaires
  entre les tables `profiles` et `roles`.

  ## Problème résolu
  - Les politiques sur `profiles` référençaient `roles` avec une jointure
  - Les politiques sur `roles` référençaient `profiles` avec une jointure
  - Cela créait une récursion infinie lors des requêtes

  ## Solution
  - Simplification des politiques pour éviter les dépendances circulaires
  - Permettre à tous les utilisateurs authentifiés de lire les tables nécessaires
  - Restreindre uniquement les opérations de modification

  ## Modifications
  1. Suppression des anciennes politiques problématiques
  2. Création de nouvelles politiques simplifiées et sécurisées
*/

-- Suppression de toutes les politiques existantes sur profiles et roles
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leur propre profil" ON profiles;
DROP POLICY IF EXISTS "Admins peuvent voir tous les profils" ON profiles;
DROP POLICY IF EXISTS "Utilisateurs peuvent mettre à jour leur propre profil" ON profiles;
DROP POLICY IF EXISTS "Admins peuvent gérer tous les profils" ON profiles;

DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les rôles" ON roles;
DROP POLICY IF EXISTS "Seuls les admins peuvent gérer les rôles" ON roles;

-- ========================================
-- POLITIQUES POUR LA TABLE PROFILES
-- ========================================

-- Lecture: Tous les utilisateurs authentifiés peuvent lire tous les profils
-- (nécessaire pour les vérifications de permissions et affichage)
CREATE POLICY "Lecture des profils pour utilisateurs authentifiés"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Mise à jour: Les utilisateurs peuvent uniquement modifier leur propre profil
CREATE POLICY "Utilisateurs peuvent modifier leur profil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insertion: Géré par le trigger handle_new_user(), permettre l'insertion
CREATE POLICY "Permettre insertion de profils"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Suppression: Interdit aux utilisateurs normaux
-- (seul le service role peut supprimer, pas de politique = accès refusé)

-- ========================================
-- POLITIQUES POUR LA TABLE ROLES
-- ========================================

-- Lecture: Tous les utilisateurs authentifiés peuvent lire les rôles
-- (nécessaire pour afficher les rôles dans l'interface)
CREATE POLICY "Lecture des rôles pour utilisateurs authentifiés"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Modification: Interdit aux utilisateurs normaux
-- (seul le service role peut modifier, pas de politique = accès refusé)

-- ========================================
-- POLITIQUES POUR LES AUTRES TABLES
-- ========================================

-- Suppression des anciennes politiques sections
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les sections" ON sections;
DROP POLICY IF EXISTS "Seuls les admins peuvent gérer les sections" ON sections;

-- Nouvelles politiques pour sections
CREATE POLICY "Lecture des sections"
  ON sections FOR SELECT
  TO authenticated
  USING (true);

-- Suppression des anciennes politiques options
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les options" ON options;
DROP POLICY IF EXISTS "Seuls les admins peuvent gérer les options" ON options;

-- Nouvelles politiques pour options
CREATE POLICY "Lecture des options"
  ON options FOR SELECT
  TO authenticated
  USING (true);

-- Commentaires
COMMENT ON POLICY "Lecture des profils pour utilisateurs authentifiés" ON profiles IS 
  'Permet à tous les utilisateurs authentifiés de lire les profils sans récursion';

COMMENT ON POLICY "Lecture des rôles pour utilisateurs authentifiés" ON roles IS 
  'Permet à tous les utilisateurs authentifiés de lire les rôles sans récursion';

-- >>> 20260402191516_create_payment_management_tables.sql
/*
  Système de Gestion des Paiements

  1. Nouvelles Tables
    - paiements: Enregistre tous les paiements effectués par les élèves
      
  2. Fonctions
    - generate_numero_recu: Génère le numéro de reçu unique globalement
    
  3. Sécurité
    - Enable RLS sur la table paiements
    - Policies pour les admins et comptables
*/

-- Table des paiements
CREATE TABLE IF NOT EXISTS paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_recu text UNIQUE,
  eleve_id uuid REFERENCES eleves(id) ON DELETE RESTRICT NOT NULL,
  nom_eleve text NOT NULL,
  classe text NOT NULL,
  type_paiement text NOT NULL CHECK (type_paiement IN ('minerval', 'fournitures_eleves', 'fournitures_bureau', 'autre')),
  description text,
  montant_paye numeric(10,2) NOT NULL CHECK (montant_paye > 0),
  montant_en_lettre text NOT NULL,
  mode_paiement text NOT NULL CHECK (mode_paiement IN ('especes', 'mobile_money', 'virement', 'cheque')),
  date_paiement date NOT NULL DEFAULT CURRENT_DATE,
  comptable_id uuid REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
  nom_comptable text NOT NULL,
  est_encaisse boolean DEFAULT false,
  date_encaissement timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_paiements_eleve ON paiements(eleve_id);
CREATE INDEX IF NOT EXISTS idx_paiements_comptable ON paiements(comptable_id);
CREATE INDEX IF NOT EXISTS idx_paiements_date ON paiements(date_paiement);
CREATE INDEX IF NOT EXISTS idx_paiements_type ON paiements(type_paiement);
CREATE INDEX IF NOT EXISTS idx_paiements_encaisse ON paiements(est_encaisse);
CREATE INDEX IF NOT EXISTS idx_paiements_numero_recu ON paiements(numero_recu);

-- Fonction pour générer le numéro de reçu unique
CREATE OR REPLACE FUNCTION generate_numero_recu()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  date_part text;
  sequence_num integer;
  new_numero text;
BEGIN
  date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(numero_recu FROM '\d+$') AS integer
      )
    ), 0
  ) INTO sequence_num
  FROM paiements
  WHERE numero_recu IS NOT NULL;
  
  sequence_num := sequence_num + 1;
  
  new_numero := 'REC-' || date_part || '-' || LPAD(sequence_num::text, 7, '0');
  
  RETURN new_numero;
END;
$$;

-- Trigger pour auto-générer le numéro de reçu
CREATE OR REPLACE FUNCTION set_numero_recu()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero_recu IS NULL THEN
    NEW.numero_recu := generate_numero_recu();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_numero_recu ON paiements;
CREATE TRIGGER trigger_set_numero_recu
  BEFORE INSERT ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION set_numero_recu();

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_paiements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_paiements_timestamp ON paiements;
CREATE TRIGGER trigger_update_paiements_timestamp
  BEFORE UPDATE ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION update_paiements_updated_at();

-- Enable RLS
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

-- Policy: Les admins peuvent tout faire
CREATE POLICY "Admins can do everything on paiements"
  ON paiements FOR ALL
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

-- Policy: Les comptables peuvent voir tous les paiements
CREATE POLICY "Comptables can view all paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'comptable')
    )
  );

-- Policy: Les comptables peuvent créer des paiements
CREATE POLICY "Comptables can create paiements"
  ON paiements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'comptable')
    )
  );

-- Policy: Les comptables peuvent modifier leurs propres paiements
CREATE POLICY "Comptables can update their own paiements"
  ON paiements FOR UPDATE
  TO authenticated
  USING (
    comptable_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  )
  WITH CHECK (
    comptable_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

-- Policy: Seuls les admins peuvent supprimer
CREATE POLICY "Only admins can delete paiements"
  ON paiements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );
-- >>> 20260402195811_add_receipt_generation_and_notifications.sql
/*
  # Amélioration Système de Paiements

  1. Nouvelles Fonctionnalités
    - Fonction de génération automatique de numéros de reçu
    - Séquence pour numérotation unique des reçus
    - Table pour tracker les notifications envoyées
    - Fonction pour obtenir les statistiques par comptable
    - Fonction pour obtenir les statistiques par période

  2. Tables
    - `notifications_log` pour tracer l'envoi de SMS/Email
    
  3. Fonctions
    - `generate_numero_recu()` pour créer numéros de reçu uniques
    - `get_comptable_stats()` pour statistiques par comptable
    - `get_period_stats()` pour statistiques par période

  4. Sécurité
    - Enable RLS sur notifications_log
    - Politiques restrictives pour accès aux données
*/

-- Créer une séquence pour les numéros de reçu
CREATE SEQUENCE IF NOT EXISTS numero_recu_seq START 1000;

-- Fonction pour générer un numéro de reçu unique
CREATE OR REPLACE FUNCTION generate_numero_recu()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num integer;
  current_year text;
  receipt_num text;
BEGIN
  -- Obtenir le prochain numéro de la séquence
  next_num := nextval('numero_recu_seq');
  
  -- Obtenir l'année courante
  current_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Format: RECU-YYYY-NNNN (ex: RECU-2026-1000)
  receipt_num := 'RECU-' || current_year || '-' || LPAD(next_num::text, 4, '0');
  
  RETURN receipt_num;
END;
$$;

-- Table pour logger les notifications envoyées
CREATE TABLE IF NOT EXISTS notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paiement_id uuid NOT NULL REFERENCES paiements(id) ON DELETE CASCADE,
  type_notification text NOT NULL CHECK (type_notification IN ('sms', 'email')),
  destinataire text NOT NULL,
  message text NOT NULL,
  statut text NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS sur notifications_log
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Politique pour que seuls les utilisateurs authentifiés avec les bons rôles puissent voir les notifications
CREATE POLICY "Authorized users can view notifications"
  ON notifications_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'IT_MANAGER', 'comptable')
    )
  );

-- Politique pour que seuls les utilisateurs autorisés puissent créer des notifications
CREATE POLICY "Authorized users can create notifications"
  ON notifications_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'IT_MANAGER', 'comptable')
    )
  );

-- Fonction pour obtenir les statistiques d'un comptable
CREATE OR REPLACE FUNCTION get_comptable_stats(
  p_comptable_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_paiements bigint,
  montant_total numeric,
  paiements_encaisses bigint,
  montant_encaisse numeric,
  paiements_en_attente bigint,
  montant_en_attente numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_paiements,
    COALESCE(SUM(montant_paye), 0) AS montant_total,
    COUNT(*) FILTER (WHERE est_encaisse = true)::bigint AS paiements_encaisses,
    COALESCE(SUM(montant_paye) FILTER (WHERE est_encaisse = true), 0) AS montant_encaisse,
    COUNT(*) FILTER (WHERE est_encaisse = false)::bigint AS paiements_en_attente,
    COALESCE(SUM(montant_paye) FILTER (WHERE est_encaisse = false), 0) AS montant_en_attente
  FROM paiements
  WHERE comptable_id = p_comptable_id
    AND (p_start_date IS NULL OR date_paiement >= p_start_date)
    AND (p_end_date IS NULL OR date_paiement <= p_end_date);
END;
$$;

-- Fonction pour obtenir les statistiques par période
CREATE OR REPLACE FUNCTION get_period_stats(
  p_comptable_id uuid,
  p_period text DEFAULT 'day'
)
RETURNS TABLE (
  period_date date,
  nombre_paiements bigint,
  montant_encaisse numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_paiement AS period_date,
    COUNT(*)::bigint AS nombre_paiements,
    COALESCE(SUM(montant_paye), 0) AS montant_encaisse
  FROM paiements
  WHERE comptable_id = p_comptable_id
    AND est_encaisse = true
    AND date_paiement >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY date_paiement
  ORDER BY date_paiement DESC;
END;
$$;

-- Trigger pour générer automatiquement le numéro de reçu
CREATE OR REPLACE FUNCTION set_numero_recu()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero_recu IS NULL THEN
    NEW.numero_recu := generate_numero_recu();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_set_numero_recu'
  ) THEN
    CREATE TRIGGER trigger_set_numero_recu
      BEFORE INSERT ON paiements
      FOR EACH ROW
      EXECUTE FUNCTION set_numero_recu();
  END IF;
END $$;

-- Ajouter un index sur les colonnes fréquemment utilisées
CREATE INDEX IF NOT EXISTS idx_paiements_comptable_id ON paiements(comptable_id);
CREATE INDEX IF NOT EXISTS idx_paiements_date_paiement ON paiements(date_paiement);
CREATE INDEX IF NOT EXISTS idx_paiements_est_encaisse ON paiements(est_encaisse);
CREATE INDEX IF NOT EXISTS idx_paiements_eleve_id ON paiements(eleve_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_paiement_id ON notifications_log(paiement_id);

-- >>> 20260402204518_fix_admin_update_profiles.sql
/*
  # Fix Admin Permissions to Update User Roles

  ## Problem
  After fixing the infinite recursion issue in migration 20260402160428, admins lost the ability to modify other users' profiles, specifically the role_id field.

  ## Solution
  1. Create a secure helper function using SECURITY DEFINER to check admin status
     - This function bypasses RLS to avoid infinite recursion
     - It's protected by running in a secure context
  
  2. Add a new RLS policy for admins and IT managers
     - Allows admins and IT_MANAGER to update any profile
     - Uses the secure function to verify admin status
     - Works alongside the existing policy for users to update their own profiles

  ## Security
  - The SECURITY DEFINER function is intentionally simple and read-only
  - It only checks if the current user has an admin or IT_MANAGER role
  - The function has a fixed search_path to prevent security exploits
  
  ## Changes
  - New function: `is_admin_or_it_manager()` (SECURITY DEFINER)
  - New policy: "Admins et IT Managers peuvent modifier tous les profils"
*/

-- Create a secure helper function to check if current user is admin or IT manager
-- SECURITY DEFINER allows this function to bypass RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION is_admin_or_it_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles p
    INNER JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    AND r.nom IN ('admin', 'IT_MANAGER')
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_or_it_manager() TO authenticated;

-- Add policy allowing admins and IT managers to update all profiles
-- This works with OR logic alongside the existing "users can update their own profile" policy
CREATE POLICY "Admins et IT Managers peuvent modifier tous les profils"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin_or_it_manager())
  WITH CHECK (is_admin_or_it_manager());

-- Create an index to optimize the admin check query
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_nom ON roles(nom);

-- >>> 20260402211701_add_secretary_payment_permissions.sql
/*
  # Ajout des permissions de paiement pour les secrétaires

  ## Description
  Cette migration permet aux secrétaires d'ajouter des paiements mais les empêche d'encaisser.
  Seuls les comptables et administrateurs peuvent encaisser les paiements.

  ## 1. Modifications des Permissions
    - Mise à jour du rôle secrétaire pour inclure la permission "paiements"
    - Les secrétaires peuvent créer des paiements (INSERT)
    - Les secrétaires peuvent voir tous les paiements (SELECT)
    - Seuls les comptables et admins peuvent encaisser (UPDATE est_encaisse)

  ## 2. Nouvelles Politiques RLS
    - Politique SELECT pour secrétaires: voir tous les paiements
    - Politique INSERT pour secrétaires: créer des paiements
    - Politique UPDATE restrictive: seuls comptables/admins peuvent modifier est_encaisse
    - Séparation claire des responsabilités entre création et encaissement

  ## 3. Sécurité
    - Les secrétaires ne peuvent pas modifier le champ est_encaisse
    - Les secrétaires ne peuvent pas modifier le champ date_encaissement
    - L'encaissement reste une opération réservée aux rôles financiers
*/

-- Mise à jour des permissions pour le rôle secrétaire
UPDATE roles
SET permissions = '{"eleves": true, "minerval": true, "fournitures": true, "paiements": true}'::jsonb
WHERE nom = 'secretaire';

-- Suppression des anciennes politiques pour les recréer avec les bonnes permissions
DROP POLICY IF EXISTS "Comptables can view all paiements" ON paiements;
DROP POLICY IF EXISTS "Comptables can create paiements" ON paiements;
DROP POLICY IF EXISTS "Comptables can update their own paiements" ON paiements;

-- Policy: Les secrétaires, comptables, directeurs et admins peuvent voir tous les paiements
CREATE POLICY "Authenticated users with payment permission can view paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable', 'secretaire', 'directeur')
    )
  );

-- Policy: Les secrétaires, comptables et admins peuvent créer des paiements
CREATE POLICY "Secretaries and comptables can create paiements"
  ON paiements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable', 'secretaire')
    )
  );

-- Policy: Seuls les comptables et admins peuvent encaisser (modifier est_encaisse)
-- Cette politique permet la modification mais sera complétée par une vérification côté application
CREATE POLICY "Only comptables and admins can update paiements"
  ON paiements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable')
    )
  );

-- >>> 20260402225208_add_classe_field_to_eleves.sql
/*
  # Add classe field to eleves table

  1. Changes
    - Add `classe` column to `eleves` table
      - Type: text
      - Nullable: yes
      - Description: Stores the class/grade of the student (e.g., "5ème A", "1ère Scientifique")
  
  2. Notes
    - This field complements the section and option fields
    - Allows more specific class designation beyond section/option
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eleves' AND column_name = 'classe'
  ) THEN
    ALTER TABLE eleves ADD COLUMN classe text;
  END IF;
END $$;
-- >>> 20260402231239_fix_options_insert_policy.sql
/*
  # Correction des politiques RLS pour la table options

  1. Problème identifié
    - La table options n'a pas de politique INSERT
    - Les administrateurs ne peuvent pas ajouter de nouvelles options

  2. Solution
    - Ajout d'une politique INSERT pour permettre aux administrateurs d'insérer des options
    - Ajout d'une politique INSERT pour la table sections si nécessaire

  3. Sécurité
    - Seuls les utilisateurs avec le rôle 'admin' peuvent insérer des options
    - Vérification via la jointure profiles -> roles
*/

-- Supprimer les anciennes politiques INSERT si elles existent
DROP POLICY IF EXISTS "Seuls les admins peuvent créer des options" ON options;
DROP POLICY IF EXISTS "Seuls les admins peuvent créer des sections" ON sections;

-- Ajouter la politique INSERT pour la table options
CREATE POLICY "Seuls les admins peuvent créer des options"
  ON options
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

-- Ajouter la politique INSERT pour la table sections
CREATE POLICY "Seuls les admins peuvent créer des sections"
  ON sections
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
-- >>> 20260402231304_create_classes_table.sql
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
-- >>> 20260402231321_add_classe_id_to_eleves.sql
/*
  # Ajout de la colonne classe_id dans la table eleves

  1. Modifications
    - Ajout de la colonne `classe_id` (uuid, nullable) dans la table eleves
    - Clé étrangère vers la table classes
    - Conservation temporaire du champ `classe` (text) pour compatibilité

  2. Contraintes
    - Clé étrangère vers classes avec ON DELETE SET NULL
    - Index sur classe_id pour optimiser les requêtes

  3. Notes
    - La colonne est nullable pour permettre la migration progressive
    - Le champ texte `classe` existant est conservé pendant la transition
*/

-- Ajouter la colonne classe_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eleves' AND column_name = 'classe_id'
  ) THEN
    ALTER TABLE eleves ADD COLUMN classe_id uuid REFERENCES classes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_eleves_classe_id ON eleves(classe_id);
-- >>> 20260402235138_add_payment_motifs_and_year.sql
/*
  # Ajout des motifs de paiement et de l'année

  1. Nouvelle Table
    - `motifs_paiement` pour gérer les motifs configurables
      - `id` (uuid, primary key)
      - `libelle` (text, unique) - Le nom du motif
      - `description` (text, nullable) - Description du motif
      - `is_active` (boolean) - Si le motif est valide/actif
      - `ordre` (integer) - Pour trier les motifs
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modifications de la table paiements
    - Ajout de la colonne `annee_scolaire` (text) - Ex: "2025-2026"
    - Ajout de la colonne `motif_id` (uuid) - Référence vers motifs_paiement

  3. Sécurité
    - Enable RLS sur `motifs_paiement`
    - Politiques pour lecture par tous les utilisateurs authentifiés
    - Politiques pour modification par admin uniquement

  4. Données initiales
    - Insertion de motifs par défaut
*/

-- Créer la table motifs_paiement
CREATE TABLE IF NOT EXISTS motifs_paiement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS sur motifs_paiement
ALTER TABLE motifs_paiement ENABLE ROW LEVEL SECURITY;

-- Politique pour que tous les utilisateurs authentifiés puissent lire les motifs actifs
CREATE POLICY "Authenticated users can view active motifs"
  ON motifs_paiement FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Politique pour que les admins puissent voir tous les motifs
CREATE POLICY "Admins can view all motifs"
  ON motifs_paiement FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = 'admin'
    )
  );

-- Politique pour que les admins puissent créer des motifs
CREATE POLICY "Admins can create motifs"
  ON motifs_paiement FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = 'admin'
    )
  );

-- Politique pour que les admins puissent modifier des motifs
CREATE POLICY "Admins can update motifs"
  ON motifs_paiement FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = 'admin'
    )
  );

-- Politique pour que les admins puissent supprimer des motifs
CREATE POLICY "Admins can delete motifs"
  ON motifs_paiement FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = 'admin'
    )
  );

-- Ajouter les colonnes à la table paiements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'annee_scolaire'
  ) THEN
    ALTER TABLE paiements ADD COLUMN annee_scolaire text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'motif_id'
  ) THEN
    ALTER TABLE paiements ADD COLUMN motif_id uuid REFERENCES motifs_paiement(id);
  END IF;
END $$;

-- Insérer des motifs par défaut
INSERT INTO motifs_paiement (libelle, description, ordre, is_active) VALUES
  ('1ère Tranche', 'Première tranche du minerval', 1, true),
  ('2ème Tranche', 'Deuxième tranche du minerval', 2, true),
  ('3ème Tranche', 'Troisième tranche du minerval', 3, true),
  ('Paiement Complet', 'Paiement complet du minerval en une fois', 4, true),
  ('Régularisation', 'Paiement de régularisation', 5, true),
  ('Rattrapage', 'Paiement pour cours de rattrapage', 6, true)
ON CONFLICT (libelle) DO NOTHING;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_paiements_motif_id ON paiements(motif_id);
CREATE INDEX IF NOT EXISTS idx_paiements_annee_scolaire ON paiements(annee_scolaire);
CREATE INDEX IF NOT EXISTS idx_motifs_paiement_is_active ON motifs_paiement(is_active);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_motif_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger pour mettre à jour updated_at automatiquement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_motif_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_motif_updated_at
      BEFORE UPDATE ON motifs_paiement
      FOR EACH ROW
      EXECUTE FUNCTION update_motif_updated_at();
  END IF;
END $$;

-- >>> 20260403015459_add_it_manager_encaissement_permission.sql
/*
  # Ajout de la permission d'encaissement pour IT_MANAGER

  ## Description
  Cette migration permet aux IT_MANAGER d'encaisser les paiements au même titre que les comptables et administrateurs.

  ## 1. Modifications des Politiques RLS
    - Mise à jour de la politique UPDATE pour inclure IT_MANAGER
    - Les IT_MANAGER peuvent maintenant encaisser les paiements (modifier est_encaisse et date_encaissement)

  ## 2. Sécurité
    - Maintien de la restriction: seuls admin, comptable et IT_MANAGER peuvent encaisser
    - Les secrétaires ne peuvent toujours pas encaisser
*/

-- Suppression de l'ancienne politique UPDATE
DROP POLICY IF EXISTS "Only comptables and admins can update paiements" ON paiements;

-- Policy: Les comptables, IT_MANAGER et admins peuvent encaisser (modifier est_encaisse)
CREATE POLICY "Comptables, IT_MANAGER and admins can update paiements"
  ON paiements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable', 'it_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable', 'it_manager')
    )
  );

-- >>> 20260403021532_add_encaisseur_to_paiements.sql
/*
  # Add encaisseur tracking to payments

  1. Changes
    - Add `encaisseur_id` column to track who actually cashed the payment
    - Add `nom_encaisseur` column to store the name of the person who cashed the payment
    
  2. Details
    - `encaisseur_id` (uuid, nullable) - References the profiles.id of the user who encaissed the payment
    - `nom_encaisseur` (text, nullable) - Full name of the user who encaissed the payment
    - Both fields remain NULL if payment is not yet encaissed
    - These fields are updated when est_encaisse is set to true
    
  3. Purpose
    - Improves audit trail by tracking both the creator and the person who actually cashed the payment
    - Maintains historical record of who handled each transaction
*/

-- Add encaisseur_id column to track who cashed the payment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'encaisseur_id'
  ) THEN
    ALTER TABLE paiements ADD COLUMN encaisseur_id uuid REFERENCES profiles(id);
  END IF;
END $$;

-- Add nom_encaisseur column to store the name of who cashed the payment
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'nom_encaisseur'
  ) THEN
    ALTER TABLE paiements ADD COLUMN nom_encaisseur text;
  END IF;
END $$;

-- Add comment to explain the columns
COMMENT ON COLUMN paiements.encaisseur_id IS 'ID of the user who encaissed the payment (may differ from comptable_id who created it)';
COMMENT ON COLUMN paiements.nom_encaisseur IS 'Full name of the user who encaissed the payment';
-- >>> 20260404193853_add_eleve_details_to_paiements.sql
/*
  # Add Eleve Details to Paiements Table

  1. Changes
    - Add `sexe` column to store student gender at payment time
    - Add `section` column to store student section at payment time
    - Add `option` column to store student option at payment time
    - Add `telephone` column to store student phone at payment time
    - Add `domicile` column to store student address at payment time

  2. Data Migration
    - Backfill existing paiements records with current eleve data
    - Uses JOIN to copy data from eleves table

  3. Purpose
    - Freeze student information at payment time for historical accuracy
    - Eliminate need for additional queries when generating receipts
    - Ensure receipts remain valid even if student data changes
*/

-- Add new columns to paiements table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'sexe'
  ) THEN
    ALTER TABLE paiements ADD COLUMN sexe TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'section'
  ) THEN
    ALTER TABLE paiements ADD COLUMN section TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'option'
  ) THEN
    ALTER TABLE paiements ADD COLUMN option TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'telephone'
  ) THEN
    ALTER TABLE paiements ADD COLUMN telephone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'domicile'
  ) THEN
    ALTER TABLE paiements ADD COLUMN domicile TEXT;
  END IF;
END $$;

-- Backfill existing paiements with data from eleves table
UPDATE paiements p
SET
  sexe = e.sexe,
  section = e.section,
  option = e.option,
  telephone = e.telephone,
  domicile = e.domicile
FROM eleves e
WHERE p.eleve_id = e.id
  AND (p.sexe IS NULL OR p.section IS NULL OR p.option IS NULL OR p.telephone IS NULL OR p.domicile IS NULL);

-- >>> 20260404203652_add_motif_libelle_to_paiements.sql
/*
  # Add motif_libelle column to paiements table

  1. Changes
    - Add `motif_libelle` column to `paiements` table (TEXT NOT NULL DEFAULT 'janvier')
    - Populate existing records with motif libelle from motifs_paiement table
    - Set 'janvier' as default for records without motif_id
  
  2. Security
    - No RLS changes needed (existing policies remain)
  
  3. Notes
    - The motif_id column is preserved for reference
    - This denormalization improves query performance by avoiding joins
    - Existing paiements will have their motif_libelle populated from motifs_paiement
*/

-- Add motif_libelle column with default value 'janvier'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'motif_libelle'
  ) THEN
    ALTER TABLE paiements ADD COLUMN motif_libelle TEXT NOT NULL DEFAULT 'janvier';
  END IF;
END $$;

-- Populate motif_libelle for existing records with motif_id
UPDATE paiements
SET motif_libelle = motifs_paiement.libelle
FROM motifs_paiement
WHERE paiements.motif_id = motifs_paiement.id
AND paiements.motif_libelle = 'janvier';

-- Records with NULL motif_id already have 'janvier' as default

-- >>> 20260404211703_add_complete_eleve_info_to_paiements.sql
/*
  # Add Complete Student Information to Payments Table

  ## Overview
  This migration adds all missing student information fields to the paiements table
  to ensure complete historical records of student data at the time of payment.

  ## Changes Made

  1. New Columns Added to `paiements` table:
    - `matricule` (text, not null) - Student registration number
    - `postnom` (text, not null) - Student's middle/family name
    - `prenom` (text, not null) - Student's first name
    - `lieu_naissance` (text, nullable) - Place of birth
    - `date_naissance` (date, nullable) - Date of birth
    - `responsable` (text, nullable) - Guardian/parent name
    - `photo_url` (text, nullable) - Student photo URL

  2. Column Modifications:
    - Update existing NULL columns to NOT NULL with default values where appropriate
    - Ensure data integrity for critical fields (sexe, section, telephone, domicile)

  3. Data Migration:
    - Backfill existing payment records with student data from eleves table
    - Ensure no data loss during the migration

  ## Security
  - No RLS changes needed (inherits existing policies)
  - All new columns follow existing security model
*/

-- Add new columns to paiements table
ALTER TABLE paiements 
  ADD COLUMN IF NOT EXISTS matricule text,
  ADD COLUMN IF NOT EXISTS postnom text,
  ADD COLUMN IF NOT EXISTS prenom text,
  ADD COLUMN IF NOT EXISTS lieu_naissance text,
  ADD COLUMN IF NOT EXISTS date_naissance date,
  ADD COLUMN IF NOT EXISTS responsable text,
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Backfill data from eleves table for existing payments
UPDATE paiements p
SET 
  matricule = e.matricule,
  postnom = e.postnom,
  prenom = e.prenom,
  lieu_naissance = e.lieu_naissance,
  date_naissance = e.date_naissance,
  responsable = e.responsable,
  sexe = COALESCE(p.sexe, e.sexe),
  section = COALESCE(p.section, e.section),
  option = COALESCE(p.option, e.option),
  classe = COALESCE(p.classe, e.classe),
  telephone = COALESCE(p.telephone, e.telephone),
  domicile = COALESCE(p.domicile, e.domicile)
FROM eleves e
WHERE p.eleve_id = e.id
  AND (p.matricule IS NULL OR p.postnom IS NULL OR p.prenom IS NULL);

-- Make critical fields NOT NULL after backfilling
ALTER TABLE paiements
  ALTER COLUMN matricule SET NOT NULL,
  ALTER COLUMN postnom SET NOT NULL,
  ALTER COLUMN prenom SET NOT NULL;

-- Ensure sexe, section, telephone, and domicile are not null for future inserts
-- (existing data may still have nulls, but new records won't)
DO $$
BEGIN
  -- Add default constraints for new records
  ALTER TABLE paiements 
    ALTER COLUMN sexe SET DEFAULT 'M',
    ALTER COLUMN section SET DEFAULT '',
    ALTER COLUMN telephone SET DEFAULT '',
    ALTER COLUMN domicile SET DEFAULT '';
END $$;

-- Create index on matricule for faster lookups
CREATE INDEX IF NOT EXISTS idx_paiements_matricule ON paiements(matricule);

-- >>> 20260404215556_add_types_paiement_and_annees_scolaires.sql
/*
  # Add Types de Paiement and Années Scolaires Configuration Tables

  1. New Tables
    - `types_paiement`: Configuration table for payment types
      - `id` (uuid, primary key)
      - `libelle` (text, unique) - Payment type label
      - `description` (text, nullable) - Description of the payment type
      - `is_active` (boolean, default true) - Whether the type is active
      - `ordre` (integer, default 0) - Display order
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `annees_scolaires`: Configuration table for school years
      - `id` (uuid, primary key)
      - `annee` (text, unique) - School year (e.g., "2025-2026")
      - `date_debut` (date, nullable) - Start date
      - `date_fin` (date, nullable) - End date
      - `is_active` (boolean, default true) - Whether the year is active
      - `ordre` (integer, default 0) - Display order
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read active records
    - Add policies for admin, IT_MANAGER, and comptable roles to manage records

  3. Initial Data
    - Insert default payment types (Minerval, Fournitures Élèves, Fournitures Bureau, Autre)
    - Insert current school year (2025-2026)
*/

-- Create types_paiement table
CREATE TABLE IF NOT EXISTS types_paiement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  ordre integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create annees_scolaires table
CREATE TABLE IF NOT EXISTS annees_scolaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annee text UNIQUE NOT NULL,
  date_debut date,
  date_fin date,
  is_active boolean DEFAULT true NOT NULL,
  ordre integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE types_paiement ENABLE ROW LEVEL SECURITY;
ALTER TABLE annees_scolaires ENABLE ROW LEVEL SECURITY;

-- RLS Policies for types_paiement
CREATE POLICY "Authenticated users can view active payment types"
  ON types_paiement FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins and managers can view all payment types"
  ON types_paiement FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'IT_MANAGER', 'comptable')
      )
    )
  );

CREATE POLICY "Admins and managers can insert payment types"
  ON types_paiement FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'IT_MANAGER')
      )
    )
  );

CREATE POLICY "Admins and managers can update payment types"
  ON types_paiement FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'IT_MANAGER')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'IT_MANAGER')
      )
    )
  );

CREATE POLICY "Admins can delete payment types"
  ON types_paiement FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom = 'admin'
      )
    )
  );

-- RLS Policies for annees_scolaires
CREATE POLICY "Authenticated users can view active school years"
  ON annees_scolaires FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins and managers can view all school years"
  ON annees_scolaires FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'IT_MANAGER', 'comptable')
      )
    )
  );

CREATE POLICY "Admins and managers can insert school years"
  ON annees_scolaires FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'IT_MANAGER')
      )
    )
  );

CREATE POLICY "Admins and managers can update school years"
  ON annees_scolaires FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'IT_MANAGER')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'IT_MANAGER')
      )
    )
  );

CREATE POLICY "Admins can delete school years"
  ON annees_scolaires FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom = 'admin'
      )
    )
  );

-- Insert default payment types
INSERT INTO types_paiement (libelle, description, ordre) VALUES
  ('Minerval', 'Frais scolaires (Minerval)', 1),
  ('Fournitures Élèves', 'Fournitures scolaires pour élèves', 2),
  ('Fournitures Bureau', 'Fournitures et matériel de bureau', 3),
  ('Autre', 'Autres paiements', 4)
ON CONFLICT (libelle) DO NOTHING;

-- Insert current school year
INSERT INTO annees_scolaires (annee, date_debut, date_fin, ordre) VALUES
  ('2025-2026', '2025-09-01', '2026-06-30', 1),
  ('2024-2025', '2024-09-01', '2025-06-30', 2)
ON CONFLICT (annee) DO NOTHING;
-- >>> 20260404215745_drop_minerval_table.sql
/*
  # Drop Minerval Table

  1. Changes
    - Drop the `minerval` table as it has been replaced by the unified `paiements` table
    - This migration consolidates all payment tracking into a single table for better data management

  2. Notes
    - This is a destructive operation
    - Make sure all data has been migrated to the paiements table before running
    - All references to minerval should now point to paiements
*/

-- Drop the minerval table if it exists
DROP TABLE IF EXISTS minerval CASCADE;
-- >>> 20260404224419_add_it_manager_role.sql
/*
  # Add IT_MANAGER Role

  1. Changes
    - Add 'it_manager' role to the roles table
    - This role has permissions to manage configuration and encaissement

  2. Security
    - No RLS changes needed, existing policies will use this role
*/

-- Insert IT_MANAGER role
INSERT INTO roles (nom, description, permissions) VALUES
  ('it_manager', 'IT Manager - Gestion technique et configuration', '{"all": true}'::jsonb)
ON CONFLICT (nom) DO NOTHING;

-- >>> 20260404224433_fix_it_manager_case_in_policies.sql
/*
  # Fix IT_MANAGER case in RLS policies

  1. Changes
    - Update all RLS policies to use lowercase 'it_manager' instead of 'IT_MANAGER'
    - Affects types_paiement and annees_scolaires tables

  2. Tables affected
    - types_paiement
    - annees_scolaires
*/

-- Drop and recreate policies for types_paiement
DROP POLICY IF EXISTS "Admins and managers can view all payment types" ON types_paiement;
DROP POLICY IF EXISTS "Admins and managers can insert payment types" ON types_paiement;
DROP POLICY IF EXISTS "Admins and managers can update payment types" ON types_paiement;

CREATE POLICY "Admins and managers can view all payment types"
  ON types_paiement FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'it_manager', 'comptable')
      )
    )
  );

CREATE POLICY "Admins and managers can insert payment types"
  ON types_paiement FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'it_manager')
      )
    )
  );

CREATE POLICY "Admins and managers can update payment types"
  ON types_paiement FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'it_manager')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'it_manager')
      )
    )
  );

-- Drop and recreate policies for annees_scolaires
DROP POLICY IF EXISTS "Admins and managers can view all school years" ON annees_scolaires;
DROP POLICY IF EXISTS "Admins and managers can insert school years" ON annees_scolaires;
DROP POLICY IF EXISTS "Admins and managers can update school years" ON annees_scolaires;

CREATE POLICY "Admins and managers can view all school years"
  ON annees_scolaires FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'it_manager', 'comptable')
      )
    )
  );

CREATE POLICY "Admins and managers can insert school years"
  ON annees_scolaires FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'it_manager')
      )
    )
  );

CREATE POLICY "Admins and managers can update school years"
  ON annees_scolaires FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'it_manager')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM roles WHERE nom IN ('admin', 'it_manager')
      )
    )
  );

-- >>> 20260404225828_fix_paiements_type_constraint.sql
/*
  # Fix paiements table to use dynamic payment types

  1. Changes to `paiements` table
    - Remove hardcoded CHECK constraint on `type_paiement`
    - Change `type_paiement` from text to UUID foreign key referencing `types_paiement`
    - Migrate existing data from text values to payment type IDs
    - Add proper foreign key relationship
  
  2. Data Migration
    - Map existing text values to corresponding payment type records:
      - 'minerval' → Minerval type UUID
      - 'fournitures_eleves' → Fournitures Élèves type UUID
      - 'fournitures_bureau' → Fournitures de Bureau type UUID
      - 'autre' → Autres type UUID
  
  3. Security
    - Update RLS policies to work with new schema
    - Maintain existing access control patterns
*/

-- Step 1: Add temporary column for new type_paiement UUID
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS type_paiement_new uuid;

-- Step 2: Migrate existing data from text to UUID
-- Map 'minerval' to Minerval type
UPDATE paiements 
SET type_paiement_new = (
  SELECT id FROM types_paiement WHERE libelle = 'Minerval' LIMIT 1
)
WHERE type_paiement = 'minerval';

-- Map 'fournitures_eleves' to Fournitures Élèves type
UPDATE paiements 
SET type_paiement_new = (
  SELECT id FROM types_paiement WHERE libelle = 'Fournitures Élèves' LIMIT 1
)
WHERE type_paiement = 'fournitures_eleves';

-- Map 'fournitures_bureau' to Fournitures de Bureau type
UPDATE paiements 
SET type_paiement_new = (
  SELECT id FROM types_paiement WHERE libelle = 'Fournitures de Bureau' LIMIT 1
)
WHERE type_paiement = 'fournitures_bureau';

-- Map 'autre' to Autres type
UPDATE paiements 
SET type_paiement_new = (
  SELECT id FROM types_paiement WHERE libelle = 'Autres' LIMIT 1
)
WHERE type_paiement = 'autre';

-- Step 3: Drop the old column
ALTER TABLE paiements DROP COLUMN IF EXISTS type_paiement;

-- Step 4: Rename new column to type_paiement
ALTER TABLE paiements RENAME COLUMN type_paiement_new TO type_paiement;

-- Step 5: Add NOT NULL constraint
ALTER TABLE paiements ALTER COLUMN type_paiement SET NOT NULL;

-- Step 6: Add foreign key constraint
ALTER TABLE paiements 
ADD CONSTRAINT fk_paiements_type_paiement 
FOREIGN KEY (type_paiement) 
REFERENCES types_paiement(id) 
ON DELETE RESTRICT;

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS idx_paiements_type_paiement_fk ON paiements(type_paiement);

-- Step 8: Update the index name if needed (drop old, it's already recreated above)
DROP INDEX IF EXISTS idx_paiements_type;

-- >>> 20260415092855_add_section_prefixes_config.sql
/*
  # Ajout de la table section_prefixes

  ## Résumé
  Création d'une table de configuration pour les préfixes de matricule par section scolaire.
  Permet aux administrateurs de modifier les préfixes (ex: SPM, SPP, SPS) sans toucher au code.

  ## Nouvelle table
  - `section_prefixes`
    - `id` (uuid, clé primaire)
    - `section` (text, unique) — nom de la section en majuscules (ex: MATERNELLE)
    - `libelle` (text) — nom affiché (ex: Maternelle)
    - `prefix` (text) — préfixe matricule 3 caractères (ex: SPM)
    - `is_active` (boolean, défaut true)
    - `ordre` (integer, défaut 0) — ordre d'affichage
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Sécurité
  - RLS activé
  - Lecture par tous les utilisateurs authentifiés
  - Modification réservée aux admins et IT managers (via roles.nom = 'admin' ou 'it_manager')

  ## Données initiales
  - MATERNELLE → SPM
  - PRIMAIRE → SPP
  - SECONDAIRE → SPS
*/

CREATE TABLE IF NOT EXISTS section_prefixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text UNIQUE NOT NULL,
  libelle text NOT NULL,
  prefix text NOT NULL,
  is_active boolean DEFAULT true,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE section_prefixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read section prefixes"
  ON section_prefixes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and IT managers can insert section prefixes"
  ON section_prefixes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON roles.id = profiles.role_id
      WHERE profiles.id = auth.uid()
      AND roles.nom IN ('admin', 'it_manager')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Admins and IT managers can update section prefixes"
  ON section_prefixes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON roles.id = profiles.role_id
      WHERE profiles.id = auth.uid()
      AND roles.nom IN ('admin', 'it_manager')
      AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON roles.id = profiles.role_id
      WHERE profiles.id = auth.uid()
      AND roles.nom IN ('admin', 'it_manager')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Admins and IT managers can delete section prefixes"
  ON section_prefixes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN roles ON roles.id = profiles.role_id
      WHERE profiles.id = auth.uid()
      AND roles.nom IN ('admin', 'it_manager')
      AND profiles.is_active = true
    )
  );

INSERT INTO section_prefixes (section, libelle, prefix, is_active, ordre) VALUES
  ('MATERNELLE', 'Maternelle', 'SPM', true, 1),
  ('PRIMAIRE', 'Primaire', 'SPP', true, 2),
  ('SECONDAIRE', 'Secondaire', 'SPS', true, 3)
ON CONFLICT (section) DO NOTHING;

-- >>> 20260415095549_add_annulation_fields_to_paiements.sql
/*
  # Ajout des champs d'annulation sur la table paiements

  ## Modifications apportées
  
  ### Table `paiements`
  - Ajout colonne `statut` (text) : valeurs possibles `en_attente`, `encaisse`, `annule`
    - Valeur par défaut : `en_attente`
    - Contrainte CHECK pour valider les valeurs autorisées
  - Ajout colonne `motif_annulation` (text) : raison de l'annulation
  - Ajout colonne `annule_par` (uuid) : identifiant de l'utilisateur qui a annulé
  - Ajout colonne `date_annulation` (timestamptz) : date et heure de l'annulation
  
  ### Migration des données existantes
  - Les paiements avec `est_encaisse = true` passent au statut `encaisse`
  - Les paiements avec `est_encaisse = false` gardent le statut `en_attente`

  ## Notes importantes
  - Aucune donnée n'est supprimée
  - La colonne `est_encaisse` est conservée pour compatibilité
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'statut'
  ) THEN
    ALTER TABLE paiements ADD COLUMN statut text NOT NULL DEFAULT 'en_attente'
      CHECK (statut IN ('en_attente', 'encaisse', 'annule'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'motif_annulation'
  ) THEN
    ALTER TABLE paiements ADD COLUMN motif_annulation text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'annule_par'
  ) THEN
    ALTER TABLE paiements ADD COLUMN annule_par uuid REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'date_annulation'
  ) THEN
    ALTER TABLE paiements ADD COLUMN date_annulation timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'nom_annuleur'
  ) THEN
    ALTER TABLE paiements ADD COLUMN nom_annuleur text;
  END IF;
END $$;

UPDATE paiements SET statut = 'encaisse' WHERE est_encaisse = true AND statut = 'en_attente';

-- >>> 20260415105009_add_it_manager_full_access_policies.sql
/*
  # IT Manager Full Access Policies

  ## Summary
  Grant the it_manager role complete access across all tables, equivalent to a super-admin.

  ## Changes
  1. Fix wrong casing 'IT_MANAGER' -> 'it_manager' in notifications_log policy
  2. Add it_manager to all table policies where admin-only access existed:
     - classes (UPDATE, DELETE)
     - eleves (ALL manage)
     - options (UPDATE, DELETE)
     - sections (UPDATE, DELETE)
     - motifs_paiement (SELECT, UPDATE, DELETE)
     - paiements (SELECT, DELETE)
     - annees_scolaires (DELETE)
     - gestion_fournitures and gestion_fourniture_bureau
     - compte_courant
  3. Add it_manager to user_activity_logs if present
*/

-- Fix notifications_log wrong casing
DROP POLICY IF EXISTS "Authorized users can view notifications" ON notifications_log;
CREATE POLICY "Authorized users can view notifications"
  ON notifications_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager', 'comptable'])
    )
  );

-- classes: add it_manager to UPDATE and DELETE
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier des classes" ON classes;
CREATE POLICY "Seuls les admins peuvent modifier des classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Seuls les admins peuvent supprimer des classes" ON classes;
CREATE POLICY "Seuls les admins peuvent supprimer des classes"
  ON classes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- eleves: add it_manager to manage
DROP POLICY IF EXISTS "Secrétaires et admins peuvent gérer les élèves" ON eleves;
CREATE POLICY "Secrétaires et admins peuvent gérer les élèves"
  ON eleves FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'secretaire', 'directeur', 'it_manager'])
    )
  );

-- options: add it_manager to UPDATE and DELETE
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier les options" ON options;
CREATE POLICY "Seuls les admins peuvent modifier les options"
  ON options FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Seuls les admins peuvent supprimer les options" ON options;
CREATE POLICY "Seuls les admins peuvent supprimer les options"
  ON options FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- sections: add it_manager
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier les sections" ON sections;
CREATE POLICY "Seuls les admins peuvent modifier les sections"
  ON sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Seuls les admins peuvent supprimer les sections" ON sections;
CREATE POLICY "Seuls les admins peuvent supprimer les sections"
  ON sections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- motifs_paiement: add it_manager to SELECT (admin-only view), UPDATE, DELETE
DROP POLICY IF EXISTS "Admins can view all motifs" ON motifs_paiement;
CREATE POLICY "Admins can view all motifs"
  ON motifs_paiement FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Admins can update motifs" ON motifs_paiement;
CREATE POLICY "Admins can update motifs"
  ON motifs_paiement FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Admins can delete motifs" ON motifs_paiement;
CREATE POLICY "Admins can delete motifs"
  ON motifs_paiement FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- paiements: add it_manager to SELECT and DELETE
DROP POLICY IF EXISTS "Authenticated users with payment permission can view paiements" ON paiements;
CREATE POLICY "Authenticated users with payment permission can view paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'secretaire', 'directeur', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Only admins can delete paiements" ON paiements;
CREATE POLICY "Only admins can delete paiements"
  ON paiements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- paiements: add it_manager to ALL (admin policy)
DROP POLICY IF EXISTS "Admins can do everything on paiements" ON paiements;
CREATE POLICY "Admins can do everything on paiements"
  ON paiements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- annees_scolaires: add it_manager to DELETE
DROP POLICY IF EXISTS "Admins can delete school years" ON annees_scolaires;
CREATE POLICY "Admins can delete school years"
  ON annees_scolaires FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role_id IN (
          SELECT roles.id FROM roles WHERE roles.nom = ANY(ARRAY['admin', 'it_manager'])
        )
    )
  );

-- types_paiement: add it_manager to DELETE
DROP POLICY IF EXISTS "Admins can delete payment types" ON types_paiement;
CREATE POLICY "Admins can delete payment types"
  ON types_paiement FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role_id IN (
          SELECT roles.id FROM roles WHERE roles.nom = ANY(ARRAY['admin', 'it_manager'])
        )
    )
  );

-- gestion_fournitures: add it_manager
DROP POLICY IF EXISTS "Secrétaires et admins peuvent gérer les fournitures élèves" ON gestion_fournitures;
CREATE POLICY "Secrétaires et admins peuvent gérer les fournitures élèves"
  ON gestion_fournitures FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'secretaire', 'directeur', 'it_manager'])
    )
  );

-- gestion_fourniture_bureau: add it_manager
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent gérer les fournitures burea" ON gestion_fourniture_bureau;
CREATE POLICY "Utilisateurs authentifiés peuvent gérer les fournitures burea"
  ON gestion_fourniture_bureau FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'secretaire', 'comptable', 'directeur', 'it_manager'])
    )
  );

-- compte_courant: add it_manager
DROP POLICY IF EXISTS "Comptables et admins peuvent gérer le compte courant" ON compte_courant;
CREATE POLICY "Comptables et admins peuvent gérer le compte courant"
  ON compte_courant FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'directeur', 'it_manager'])
    )
  );

-- >>> 20260415110822_add_coordonnateur_role.sql
/*
  # Add Coordonnateur Role

  ## Summary
  Adds a new "coordonnateur" role to the system with read-only access.

  ## Changes
  1. New role inserted into `roles` table:
     - `nom`: 'coordonnateur'
     - `permissions`: {"read_only": true, "can_view_dashboard": true, "can_export": true}
     - `description`: Read-only coordinator role with full visibility but no write access

  ## Notes
  - The coordonnateur can view all pages including the comptable dashboard and reports
  - The coordonnateur CANNOT create, edit, or delete any records
  - The coordonnateur CANNOT access Configuration or Administration pages (admin-only)
  - Export/download features remain accessible to the coordonnateur
*/

INSERT INTO roles (nom, permissions, description)
SELECT 'coordonnateur', '{"read_only": true, "can_view_dashboard": true, "can_export": true}'::jsonb, 'Coordinateur - Accès en lecture seule avec visibilité complète'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE nom = 'coordonnateur'
);

-- >>> 20260415114839_add_statut_to_compte_courant.sql
/*
  # Add statut column to compte_courant

  ## Summary
  Adds a workflow status field to financial transactions to support an approval and disbursement/collection workflow.

  ## Changes
  - `compte_courant` table:
    - New column `statut` (text) with allowed values: en_attente, approuve, decaisse, encaisse
    - Default value: 'en_attente' (all new transactions start as pending)

  ## Workflow
  1. New transaction created → statut = 'en_attente'
  2. Approved by admin/it_manager/coordonnateur → statut = 'approuve'
  3. For 'dépense': approved → 'decaisse' (by it_manager or comptable)
  4. For 'recette': approved → 'encaisse' (by it_manager or comptable)

  ## Security
  Existing RLS policies remain unchanged.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compte_courant' AND column_name = 'statut'
  ) THEN
    ALTER TABLE compte_courant
      ADD COLUMN statut text NOT NULL DEFAULT 'en_attente'
      CHECK (statut IN ('en_attente', 'approuve', 'decaisse', 'encaisse'));
  END IF;
END $$;

-- >>> 20260415115928_add_comptable_approbateur_to_compte_courant.sql
/*
  # Add comptable and approbateur fields to compte_courant

  ## Changes
  - `nom_comptable` (text, nullable): Name of the user who created the transaction
  - `nom_approbateur` (text, nullable): Name of the user who approved the transaction (filled at approval time)

  ## Notes
  - These columns store denormalized names for performance and audit trail purposes
  - nom_approbateur is populated only when a transaction is approved
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compte_courant' AND column_name = 'nom_comptable'
  ) THEN
    ALTER TABLE compte_courant ADD COLUMN nom_comptable text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compte_courant' AND column_name = 'nom_approbateur'
  ) THEN
    ALTER TABLE compte_courant ADD COLUMN nom_approbateur text;
  END IF;
END $$;

-- >>> 20260415130738_fix_is_admin_or_it_manager_case.sql
/*
  # Fix is_admin_or_it_manager function case mismatch

  ## Problem
  The function `is_admin_or_it_manager()` was checking for 'IT_MANAGER' (uppercase)
  but the actual role name stored in the `roles` table is 'it_manager' (lowercase).
  This caused RLS policy failures silently, blocking profile reads inside the
  delete-user edge function and returning 403 Forbidden.

  ## Changes
  - Updated the `is_admin_or_it_manager()` function to use lowercase 'it_manager'
    to match the actual value stored in the roles table.
*/

CREATE OR REPLACE FUNCTION public.is_admin_or_it_manager()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    INNER JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    AND r.nom IN ('admin', 'it_manager')
  );
END;
$$;

-- >>> 20260423212527_add_types_uniforme_and_gestion_uniformes.sql
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

-- >>> 20260423214500_add_stock_uniformes_with_trigger.sql
/*
  # Gestion du stock des uniformes

  ## Résumé
  Ce migration ajoute un système complet de gestion des stocks d'uniformes scolaires,
  avec un contrôle automatique côté base de données qui empêche toute distribution
  si le stock est insuffisant.

  ## Nouvelles tables

  ### `stock_uniformes`
  Enregistre les quantités disponibles par type d'article et par année scolaire.
  - `id` (uuid, primary key)
  - `type_uniforme_id` (uuid, FK vers types_uniforme) — article concerné
  - `type_uniforme_libelle` (text) — libellé dénormalisé pour l'historique
  - `annee_scolaire` (text) — ex: "2025-2026"
  - `quantite_stock` (integer, NOT NULL, >= 0) — quantité disponible
  - `seuil_alerte` (integer, nullable) — seuil en dessous duquel on affiche une alerte
  - `notes` (text, nullable)
  - `comptable_id` (uuid, FK vers auth.users)
  - `nom_comptable` (text)
  - `created_at`, `updated_at` (timestamps)
  - Contrainte unique sur (type_uniforme_id, annee_scolaire)

  ## Trigger

  ### `trg_check_and_decrement_stock`
  Se déclenche BEFORE INSERT sur `gestion_uniformes`.
  - Vérifie l'existence d'un enregistrement de stock pour (type_uniforme_id, annee_scolaire)
  - Lève une exception si le stock n'est pas configuré
  - Lève une exception si quantite_stock < quantite demandée
  - Déduit la quantite du stock si tout est OK

  ## Sécurité
  - RLS activé sur stock_uniformes
  - Lecture: tous les authentifiés
  - INSERT/UPDATE: admin, it_manager, secretaire
  - DELETE: admin, it_manager uniquement
*/

-- =============================================
-- TABLE: stock_uniformes
-- =============================================
CREATE TABLE IF NOT EXISTS stock_uniformes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_uniforme_id uuid NOT NULL REFERENCES types_uniforme(id) ON DELETE CASCADE,
  type_uniforme_libelle text NOT NULL,
  annee_scolaire text NOT NULL,
  quantite_stock integer NOT NULL DEFAULT 0 CHECK (quantite_stock >= 0),
  seuil_alerte integer,
  notes text,
  comptable_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nom_comptable text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_stock_par_article_annee UNIQUE (type_uniforme_id, annee_scolaire)
);

ALTER TABLE stock_uniformes ENABLE ROW LEVEL SECURITY;

-- Lecture: tous les authentifiés
CREATE POLICY "Authenticated users can view stock_uniformes"
  ON stock_uniformes FOR SELECT
  TO authenticated
  USING (true);

-- Insertion: admin, it_manager, secretaire
CREATE POLICY "Staff can insert stock_uniformes"
  ON stock_uniformes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager', 'secretaire')
    )
  );

-- Mise à jour: admin, it_manager, secretaire
CREATE POLICY "Staff can update stock_uniformes"
  ON stock_uniformes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager', 'secretaire')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager', 'secretaire')
    )
  );

-- Suppression: admin et it_manager uniquement
CREATE POLICY "Admins and IT managers can delete stock_uniformes"
  ON stock_uniformes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_stock_uniformes_type_annee
  ON stock_uniformes(type_uniforme_id, annee_scolaire);

-- =============================================
-- TRIGGER: contrôle et déduction du stock
-- =============================================

CREATE OR REPLACE FUNCTION check_and_decrement_uniforme_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_record stock_uniformes%ROWTYPE;
BEGIN
  -- Vérifier si un enregistrement de stock existe pour cet article + cette année
  SELECT * INTO v_stock_record
  FROM stock_uniformes
  WHERE type_uniforme_id = NEW.type_uniforme_id
    AND annee_scolaire = NEW.annee_scolaire
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock non configuré pour cet article (%) et cette année scolaire (%). Veuillez d''abord approvisionner le stock.',
      NEW.type_uniforme_libelle, NEW.annee_scolaire;
  END IF;

  IF v_stock_record.quantite_stock < NEW.quantite THEN
    RAISE EXCEPTION 'Stock insuffisant pour % : % article(s) disponible(s), % demandé(s).',
      NEW.type_uniforme_libelle,
      v_stock_record.quantite_stock,
      NEW.quantite;
  END IF;

  -- Déduire la quantité distribuée du stock
  UPDATE stock_uniformes
  SET
    quantite_stock = quantite_stock - NEW.quantite,
    updated_at = now()
  WHERE id = v_stock_record.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_and_decrement_stock ON gestion_uniformes;

CREATE TRIGGER trg_check_and_decrement_stock
  BEFORE INSERT ON gestion_uniformes
  FOR EACH ROW
  EXECUTE FUNCTION check_and_decrement_uniforme_stock();

-- >>> 20260423215342_add_section_to_stock_uniformes.sql
/*
  # Différenciation du stock uniformes par section

  ## Résumé
  Ajoute la notion de section au stock d'uniformes. Chaque article est maintenant
  géré par triplet (article, année scolaire, section), permettant de stocker
  séparément les quantités pour la Maternelle, le Primaire, le Secondaire, etc.

  ## Modifications

  ### Table `stock_uniformes`
  - Ajout de la colonne `section` (text, NOT NULL, default '')
  - Suppression de l'ancienne contrainte unique `unique_stock_par_article_annee`
  - Ajout d'une nouvelle contrainte unique sur (type_uniforme_id, annee_scolaire, section)

  ### Fonction trigger `check_and_decrement_uniforme_stock`
  - Recherche maintenant le stock par (type_uniforme_id, annee_scolaire, section)
  - Message d'erreur incluant la section concernée

  ## Notes
  1. Les enregistrements existants conservent une section vide ('') par défaut.
     Les administrateurs doivent assigner une section aux stocks existants.
  2. La contrainte unique permet d'avoir des stocks séparés par section pour
     un même article et une même année.
*/

-- Ajouter la colonne section si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_uniformes' AND column_name = 'section'
  ) THEN
    ALTER TABLE stock_uniformes ADD COLUMN section text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Remplacer l'ancienne contrainte unique
ALTER TABLE stock_uniformes DROP CONSTRAINT IF EXISTS unique_stock_par_article_annee;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_stock_par_article_annee_section'
  ) THEN
    ALTER TABLE stock_uniformes
      ADD CONSTRAINT unique_stock_par_article_annee_section
      UNIQUE (type_uniforme_id, annee_scolaire, section);
  END IF;
END $$;

-- Nouvel index prenant en compte la section
DROP INDEX IF EXISTS idx_stock_uniformes_type_annee;
CREATE INDEX IF NOT EXISTS idx_stock_uniformes_type_annee_section
  ON stock_uniformes(type_uniforme_id, annee_scolaire, section);

-- Mise à jour du trigger pour prendre en compte la section
CREATE OR REPLACE FUNCTION check_and_decrement_uniforme_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_record stock_uniformes%ROWTYPE;
BEGIN
  SELECT * INTO v_stock_record
  FROM stock_uniformes
  WHERE type_uniforme_id = NEW.type_uniforme_id
    AND annee_scolaire = NEW.annee_scolaire
    AND section = COALESCE(NEW.section, '')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock non configuré pour cet article (%) en section "%" pour l''année scolaire "%". Veuillez d''abord approvisionner le stock.',
      NEW.type_uniforme_libelle, COALESCE(NEW.section, '(aucune)'), NEW.annee_scolaire;
  END IF;

  IF v_stock_record.quantite_stock < NEW.quantite THEN
    RAISE EXCEPTION 'Stock insuffisant pour % en section "%" : % article(s) disponible(s), % demandé(s).',
      NEW.type_uniforme_libelle,
      COALESCE(NEW.section, '(aucune)'),
      v_stock_record.quantite_stock,
      NEW.quantite;
  END IF;

  UPDATE stock_uniformes
  SET
    quantite_stock = quantite_stock - NEW.quantite,
    updated_at = now()
  WHERE id = v_stock_record.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>> 20260423224208_decouple_uniformes_from_paiements.sql
/*
  # Découplage des Uniformes de la table Paiements

  Les distributions d'uniformes ne sont plus facturées et ne doivent plus
  apparaître dans la rubrique Paiements. Cette migration :

  1. Supprime toutes les lignes de `paiements` liées au type "Uniformes".
     Ces entrées étaient créées en même temps qu'une distribution d'uniforme
     et deviennent obsolètes.
  2. Retire la clé étrangère `gestion_uniformes_paiement_id_fkey`.
  3. Supprime les colonnes `paiement_id` et `numero_recu` de `gestion_uniformes`.
  4. Supprime (soft) le type de paiement "Uniformes" en le désactivant
     (is_active = false) afin de conserver l'historique mais éviter sa
     sélection future.

  ## Notes
  - La table `gestion_fournitures` (ancienne gestion EPS/Pull) est conservée
    intacte à des fins d'historique, mais n'est plus utilisée par l'interface.
*/

-- 1) Supprimer d'abord les liens pour autoriser la suppression côté paiements
UPDATE public.gestion_uniformes
SET paiement_id = NULL
WHERE paiement_id IS NOT NULL;

-- 2) Supprimer les paiements dont le type correspond à "Uniformes"
DELETE FROM public.paiements
WHERE type_paiement IN (
  SELECT id FROM public.types_paiement WHERE libelle = 'Uniformes'
);

-- 3) Supprimer la contrainte de clé étrangère si elle existe encore
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'gestion_uniformes_paiement_id_fkey'
      AND table_name = 'gestion_uniformes'
  ) THEN
    ALTER TABLE public.gestion_uniformes
      DROP CONSTRAINT gestion_uniformes_paiement_id_fkey;
  END IF;
END $$;

-- 4) Supprimer les colonnes paiement_id et numero_recu
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gestion_uniformes' AND column_name = 'paiement_id'
  ) THEN
    ALTER TABLE public.gestion_uniformes DROP COLUMN paiement_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gestion_uniformes' AND column_name = 'numero_recu'
  ) THEN
    ALTER TABLE public.gestion_uniformes DROP COLUMN numero_recu;
  END IF;
END $$;

-- 5) Désactiver le type de paiement "Uniformes"
UPDATE public.types_paiement
SET is_active = false
WHERE libelle = 'Uniformes';

-- >>> 20260424002308_add_gestionnaire_uniforme_and_revoque_roles.sql
/*
  # Ajout des rôles Gestionnaire Uniforme et Révoqué

  ## Description
  Cette migration ajoute deux nouveaux rôles au système JIMPRO :
  - `gestionnaire_uniforme` : rôle dédié à la gestion des uniformes,
    avec accès limité aux onglets Élèves, Fournitures Élèves et Stock Uniformes (lecture seule des stocks)
  - `revoque` : rôle bloquant qui révoque tout accès aux fonctionnalités de l'application

  ## 1. Modifications
  - Insertion de deux nouveaux rôles dans la table `roles`
  - Les rôles utilisent `ON CONFLICT (nom) DO NOTHING` pour permettre la ré-exécution

  ## 2. Notes Importantes
  - Aucune nouvelle table n'est créée
  - Aucune politique RLS existante n'est modifiée
  - Les permissions sont stockées dans le champ jsonb `permissions` et interprétées côté application
*/

INSERT INTO roles (nom, description, permissions)
VALUES (
  'gestionnaire_uniforme',
  'Gestionnaire des uniformes - accès limité aux élèves, fournitures élèves et stocks uniformes en lecture',
  '{"eleves": true, "fournitures_eleves": true, "stock_uniformes_read": true}'::jsonb
)
ON CONFLICT (nom) DO NOTHING;

INSERT INTO roles (nom, description, permissions)
VALUES (
  'revoque',
  'Compte révoqué - aucun accès aux fonctionnalités de l application',
  '{}'::jsonb
)
ON CONFLICT (nom) DO NOTHING;

-- >>> 20260424003438_set_revoque_as_default_new_user_role.sql
/*
  # Définir le rôle "revoque" comme rôle par défaut des nouveaux utilisateurs

  ## Description
  Cette migration met à jour la fonction `handle_new_user()` afin que tout nouvel utilisateur
  inscrit reçoive automatiquement le rôle `revoque` (au lieu de `secretaire`).
  Un administrateur devra ensuite lui attribuer un rôle effectif.

  ## 1. Modifications
  - Redéfinition de la fonction `handle_new_user()` via `CREATE OR REPLACE`
  - Le rôle attribué par défaut devient `revoque`
  - Le trigger `on_auth_user_created` reste inchangé et appellera la nouvelle version

  ## 2. Notes Importantes
  - Aucun profil existant n'est modifié
  - Si le rôle `revoque` n'existe pas (cas improbable), `role_id` sera NULL
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nom, prenom, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    (SELECT id FROM roles WHERE nom = 'revoque' LIMIT 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- >>> 20260424011051_fix_function_search_path_and_rls_always_true.sql
/*
  # Correctifs de sécurité - search_path et politiques RLS permissives

  ## Description
  Cette migration corrige deux familles de problèmes de sécurité détectés :

  ### 1. Fonctions avec `search_path` mutable
  Toutes les fonctions PL/pgSQL du schéma `public` reçoivent un `search_path`
  figé (`public, pg_temp`) via `ALTER FUNCTION ... SET search_path`. Cela empêche
  un attaquant de manipuler le schéma de résolution des objets utilisés par
  les fonctions SECURITY DEFINER notamment.

  Fonctions corrigées :
  - `set_numero_recu()`
  - `update_paiements_updated_at()`
  - `generate_numero_recu()`
  - `get_comptable_stats(uuid, date, date)`
  - `get_period_stats(uuid, text)`
  - `update_classes_updated_at()`
  - `update_motif_updated_at()`
  - `check_and_decrement_uniforme_stock()`
  - `update_updated_at_column()`
  - `handle_new_user()`

  ### 2. Politiques RLS avec WITH CHECK = true
  Deux politiques INSERT étaient permissives (`WITH CHECK (true)`) :

  - `profiles.Permettre insertion de profils` : remplacée par une politique
    exigeant que l'utilisateur n'insère qu'un profil dont l'`id` correspond
    à son propre `auth.uid()`. Cela permet au flux d'inscription (et au
    trigger `handle_new_user` qui reste SECURITY DEFINER) de fonctionner sans
    accorder d'insertion arbitraire aux utilisateurs authentifiés.

  - `user_activity_logs.Système peut créer des logs` : remplacée par une
    politique exigeant que `user_id = auth.uid()`, afin qu'un utilisateur ne
    puisse créer un log qu'à son propre nom.

  ## 2. Notes Importantes
  - Aucune donnée n'est modifiée
  - Les politiques sont recréées avec `DROP POLICY IF EXISTS` puis `CREATE POLICY`
  - Le trigger `handle_new_user` reste en SECURITY DEFINER, il contourne donc
    les politiques RLS — son fonctionnement n'est pas impacté
*/

-- 1. Fixer le search_path de toutes les fonctions concernées
ALTER FUNCTION public.set_numero_recu() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_paiements_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_numero_recu() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_comptable_stats(uuid, date, date) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_period_stats(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_classes_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_motif_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_and_decrement_uniforme_stock() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- 2. Remplacer les politiques INSERT trop permissives

-- profiles
DROP POLICY IF EXISTS "Permettre insertion de profils" ON public.profiles;

CREATE POLICY "Utilisateur peut inserer son propre profil"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- user_activity_logs
DROP POLICY IF EXISTS "Système peut créer des logs" ON public.user_activity_logs;

CREATE POLICY "Utilisateur peut creer ses propres logs"
  ON public.user_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- >>> 20260424013329_allow_gestionnaire_uniforme_insert_distribution.sql
/*
  # Autoriser le rôle `gestionnaire_uniforme` à enregistrer une distribution

  ## Description
  Le rôle `gestionnaire_uniforme` est dédié à la gestion des uniformes.
  Il devait pouvoir enregistrer une distribution d'uniforme (insertion dans
  `gestion_uniformes`), mais la politique RLS d'insertion existante ne
  l'autorisait pas. Cette migration met à jour la politique INSERT pour
  inclure ce rôle.

  ## 1. Modifications
  - Suppression de la politique `Staff can insert gestion_uniformes`
  - Création d'une nouvelle politique INSERT identique mais ajoutant
    `gestionnaire_uniforme` à la liste des rôles autorisés

  ## 2. Notes Importantes
  - Les politiques SELECT, UPDATE et DELETE ne sont pas modifiées
  - La mise à jour / suppression reste réservée aux administrateurs et IT managers
*/

DROP POLICY IF EXISTS "Staff can insert gestion_uniformes" ON public.gestion_uniformes;

CREATE POLICY "Staff can insert gestion_uniformes"
  ON public.gestion_uniformes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager', 'secretaire', 'comptable', 'coordonnateur', 'gestionnaire_uniforme')
    )
  );

-- >>> 20260525194741_add_chat_module_tables.sql
/*
  # Add Chat Module - Tables and Base Security

  ## New Tables
  - `chat_conversations`: conversation records (broadcast or private)
  - `chat_participants`: links users to private conversations
  - `chat_messages`: individual messages
  - `chat_message_reads`: read receipts per user

  ## Security
  RLS enabled on all tables with restrictive policies.
  Broadcast channel seeded with a fixed UUID.
*/

-- Conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('broadcast', 'private')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Participants
CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Message reads
CREATE TABLE IF NOT EXISTS chat_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE chat_message_reads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chat_message_reads_user_id ON chat_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_message_id ON chat_message_reads(message_id);

-- Seed broadcast conversation
INSERT INTO chat_conversations (id, type)
VALUES ('00000000-0000-0000-0000-000000000001', 'broadcast')
ON CONFLICT (id) DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reads;

-- >>> 20260525194753_add_chat_module_rls_policies.sql
/*
  # Add Chat Module - RLS Policies

  Adds Row Level Security policies for all chat tables.
  Separated from table creation to avoid forward-reference issues.

  ## Policies added:
  - chat_conversations: view broadcast, view private if participant, insert
  - chat_participants: view own/co-participants, insert self
  - chat_messages: view broadcast messages, view private messages if participant, insert own
  - chat_message_reads: view own reads, insert own reads
*/

-- chat_conversations policies
CREATE POLICY "View broadcast conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (type = 'broadcast');

CREATE POLICY "View private conversations if participant"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    type = 'private' AND
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.conversation_id = chat_conversations.id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Create conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- chat_participants policies
CREATE POLICY "View participants in own conversations"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.conversation_id = chat_participants.conversation_id
      AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "Join conversations as self"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- chat_messages policies
CREATE POLICY "View messages in broadcast conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations cc
      WHERE cc.id = chat_messages.conversation_id AND cc.type = 'broadcast'
    )
  );

CREATE POLICY "View messages in private conversations if participant"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = chat_messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Send own messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- chat_message_reads policies
CREATE POLICY "View own read receipts"
  ON chat_message_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Mark messages as read for self"
  ON chat_message_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- >>> 20260525200053_fix_chat_participants_rls_insert_policy.sql
/*
  # Fix chat_participants INSERT RLS policy

  ## Problem
  The original INSERT policy only allowed users to insert rows where user_id = auth.uid().
  This blocked inserting the OTHER participant when creating a private conversation,
  causing conversations to be created with only one participant.

  ## Fix
  Replace the restrictive INSERT policy with one that allows inserting a participant if:
  - The row being inserted is for the current user (self), OR
  - The current user is already a participant in the same conversation
    (meaning they just created it and are adding the other person)

  This preserves security: no one can add someone to a conversation they don't belong to.
*/

DROP POLICY IF EXISTS "Join conversations as self" ON chat_participants;

CREATE POLICY "Insert participant if self or already in conversation"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = chat_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

-- >>> 20260613090331_fix_paiements_eleve_fk_cascade.sql
ALTER TABLE paiements
  DROP CONSTRAINT paiements_eleve_id_fkey,
  ADD CONSTRAINT paiements_eleve_id_fkey
    FOREIGN KEY (eleve_id) REFERENCES eleves(id) ON DELETE CASCADE;

-- >>> 20260613103439_add_logo_storage_and_app_settings.sql
-- Table to store app-wide settings (key-value)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_app_settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_app_settings" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_it_manager());

CREATE POLICY "update_app_settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_it_manager())
  WITH CHECK (public.is_admin_or_it_manager());

CREATE POLICY "delete_app_settings" ON public.app_settings
  FOR DELETE TO authenticated
  USING (public.is_admin_or_it_manager());

-- Create logos storage bucket (public so images can be served without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for logos bucket
CREATE POLICY "logos_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

CREATE POLICY "logos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND public.is_admin_or_it_manager());

CREATE POLICY "logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND public.is_admin_or_it_manager())
  WITH CHECK (bucket_id = 'logos' AND public.is_admin_or_it_manager());

CREATE POLICY "logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND public.is_admin_or_it_manager());

-- Insert default logo setting
INSERT INTO public.app_settings (key, value)
VALUES ('logo_url', NULL)
ON CONFLICT (key) DO NOTHING;

-- >>> 20260702111233_add_secretaire_to_compte_courant_policy.sql
-- Add secretaire role to compte_courant management policy
DROP POLICY IF EXISTS "Comptables et admins peuvent gérer le compte courant" ON compte_courant;

CREATE POLICY "Comptables et admins peuvent gérer le compte courant"
  ON compte_courant FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'directeur', 'it_manager', 'secretaire'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'directeur', 'it_manager', 'secretaire'])
    )
  );

-- >>> 20260702122034_add_mois_minerval_to_paiements.sql
-- Add mois_minerval column to paiements table for tracking monthly Minerval payments
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS mois_minerval text;

-- Add a unique constraint to prevent duplicate Minerval payments for the same month/student/year
CREATE UNIQUE INDEX IF NOT EXISTS idx_paiements_minerval_unique_month
  ON paiements (eleve_id, type_paiement, annee_scolaire, mois_minerval)
  WHERE mois_minerval IS NOT NULL AND statut != 'annule';

-- >>> 20260703145430_add_menu_visibility_table.sql
/*
# Ajout de la table menu_visibility pour la configuration du menu par role

1. Nouvelle Table
   - `menu_visibility`
     - `id` (uuid, cle primaire)
     - `role_id` (uuid, FK vers roles.id, ON DELETE CASCADE)
     - `menu_key` (text, identifiant unique du menu)
     - `label` (text, libelle affiche)
     - `is_visible` (boolean, defaut true)
     - `ordre` (integer, defaut 0)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
     - Contrainte UNIQUE sur (role_id, menu_key)

2. Securite
   - RLS active sur la table
   - SELECT pour tous les utilisateurs authentifies
   - INSERT/UPDATE/DELETE uniquement pour admin et it_manager

3. Donnees initiales
   - Insertion des menus par defaut pour chaque role existant
   - Basees sur la logique actuelle du Layout.tsx

4. Notes
   - Le role "revoque" n'a aucun menu visible
   - Le role "it_manager" a tous les menus visibles
   - L'ordre determine l'affichage dans la sidebar
*/

-- Table menu_visibility
CREATE TABLE IF NOT EXISTS menu_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  menu_key text NOT NULL,
  label text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role_id, menu_key)
);

-- Activer RLS
ALTER TABLE menu_visibility ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
DROP POLICY IF EXISTS "select_menu_visibility" ON menu_visibility;
CREATE POLICY "select_menu_visibility" ON menu_visibility FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_menu_visibility" ON menu_visibility;
CREATE POLICY "insert_menu_visibility" ON menu_visibility FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

DROP POLICY IF EXISTS "update_menu_visibility" ON menu_visibility;
CREATE POLICY "update_menu_visibility" ON menu_visibility FOR UPDATE
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

DROP POLICY IF EXISTS "delete_menu_visibility" ON menu_visibility;
CREATE POLICY "delete_menu_visibility" ON menu_visibility FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

-- Trigger pour mettre a jour updated_at
CREATE OR REPLACE FUNCTION update_menu_visibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_menu_visibility_updated_at ON menu_visibility;
CREATE TRIGGER trigger_menu_visibility_updated_at
  BEFORE UPDATE ON menu_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_visibility_updated_at();

-- Insertion des donnees initiales pour chaque role
-- Definition des menus disponibles
DO $$
DECLARE
  r_admin uuid;
  r_secretaire uuid;
  r_comptable uuid;
  r_directeur uuid;
  r_coordonnateur uuid;
  r_gestionnaire uuid;
  r_it_manager uuid;
  r_revoque uuid;
BEGIN
  SELECT id INTO r_admin FROM roles WHERE nom = 'admin';
  SELECT id INTO r_secretaire FROM roles WHERE nom = 'secretaire';
  SELECT id INTO r_comptable FROM roles WHERE nom = 'comptable';
  SELECT id INTO r_directeur FROM roles WHERE nom = 'directeur';
  SELECT id INTO r_coordonnateur FROM roles WHERE nom = 'coordonnateur';
  SELECT id INTO r_gestionnaire FROM roles WHERE nom = 'gestionnaire_uniforme';
  SELECT id INTO r_it_manager FROM roles WHERE nom = 'it_manager';
  SELECT id INTO r_revoque FROM roles WHERE nom = 'revoque';

  -- Admin: tous les menus visibles
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_admin, 'dashboard', 'Tableau de Bord', true, 1),
    (r_admin, 'eleves', 'Eleves', true, 2),
    (r_admin, 'paiements', 'Paiements', true, 3),
    (r_admin, 'finances', 'Finances', true, 4),
    (r_admin, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_admin, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_admin, 'stock-uniformes', 'Stock Uniformes', true, 7),
    (r_admin, 'rapports', 'Rapports', true, 8),
    (r_admin, 'tableau-bord-comptable', 'TB Comptable', true, 9),
    (r_admin, 'configuration', 'Configuration', true, 10),
    (r_admin, 'admin', 'Administration', true, 11),
    (r_admin, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- IT Manager: tous les menus visibles
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_it_manager, 'dashboard', 'Tableau de Bord', true, 1),
    (r_it_manager, 'eleves', 'Eleves', true, 2),
    (r_it_manager, 'paiements', 'Paiements', true, 3),
    (r_it_manager, 'finances', 'Finances', true, 4),
    (r_it_manager, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_it_manager, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_it_manager, 'stock-uniformes', 'Stock Uniformes', true, 7),
    (r_it_manager, 'rapports', 'Rapports', true, 8),
    (r_it_manager, 'tableau-bord-comptable', 'TB Comptable', true, 9),
    (r_it_manager, 'configuration', 'Configuration', true, 10),
    (r_it_manager, 'admin', 'Administration', true, 11),
    (r_it_manager, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Secretaire: pas admin, pas TB comptable, pas config
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_secretaire, 'dashboard', 'Tableau de Bord', true, 1),
    (r_secretaire, 'eleves', 'Eleves', true, 2),
    (r_secretaire, 'paiements', 'Paiements', true, 3),
    (r_secretaire, 'finances', 'Finances', true, 4),
    (r_secretaire, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_secretaire, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_secretaire, 'stock-uniformes', 'Stock Uniformes', true, 7),
    (r_secretaire, 'rapports', 'Rapports', true, 8),
    (r_secretaire, 'tableau-bord-comptable', 'TB Comptable', false, 9),
    (r_secretaire, 'configuration', 'Configuration', false, 10),
    (r_secretaire, 'admin', 'Administration', false, 11),
    (r_secretaire, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Comptable
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_comptable, 'dashboard', 'Tableau de Bord', true, 1),
    (r_comptable, 'eleves', 'Eleves', true, 2),
    (r_comptable, 'paiements', 'Paiements', true, 3),
    (r_comptable, 'finances', 'Finances', true, 4),
    (r_comptable, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_comptable, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_comptable, 'stock-uniformes', 'Stock Uniformes', false, 7),
    (r_comptable, 'rapports', 'Rapports', true, 8),
    (r_comptable, 'tableau-bord-comptable', 'TB Comptable', false, 9),
    (r_comptable, 'configuration', 'Configuration', false, 10),
    (r_comptable, 'admin', 'Administration', false, 11),
    (r_comptable, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Directeur
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_directeur, 'dashboard', 'Tableau de Bord', true, 1),
    (r_directeur, 'eleves', 'Eleves', true, 2),
    (r_directeur, 'paiements', 'Paiements', true, 3),
    (r_directeur, 'finances', 'Finances', true, 4),
    (r_directeur, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_directeur, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_directeur, 'stock-uniformes', 'Stock Uniformes', false, 7),
    (r_directeur, 'rapports', 'Rapports', true, 8),
    (r_directeur, 'tableau-bord-comptable', 'TB Comptable', false, 9),
    (r_directeur, 'configuration', 'Configuration', false, 10),
    (r_directeur, 'admin', 'Administration', false, 11),
    (r_directeur, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Coordonnateur: acces lecture + TB Comptable
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_coordonnateur, 'dashboard', 'Tableau de Bord', true, 1),
    (r_coordonnateur, 'eleves', 'Eleves', true, 2),
    (r_coordonnateur, 'paiements', 'Paiements', true, 3),
    (r_coordonnateur, 'finances', 'Finances', true, 4),
    (r_coordonnateur, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_coordonnateur, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_coordonnateur, 'stock-uniformes', 'Stock Uniformes', false, 7),
    (r_coordonnateur, 'rapports', 'Rapports', true, 8),
    (r_coordonnateur, 'tableau-bord-comptable', 'TB Comptable', true, 9),
    (r_coordonnateur, 'configuration', 'Configuration', false, 10),
    (r_coordonnateur, 'admin', 'Administration', false, 11),
    (r_coordonnateur, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Gestionnaire Uniforme: acces limite
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_gestionnaire, 'dashboard', 'Tableau de Bord', false, 1),
    (r_gestionnaire, 'eleves', 'Eleves', true, 2),
    (r_gestionnaire, 'paiements', 'Paiements', false, 3),
    (r_gestionnaire, 'finances', 'Finances', false, 4),
    (r_gestionnaire, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_gestionnaire, 'fournitures-bureau', 'Fournitures Bureau', false, 6),
    (r_gestionnaire, 'stock-uniformes', 'Stock Uniformes', true, 7),
    (r_gestionnaire, 'rapports', 'Rapports', false, 8),
    (r_gestionnaire, 'tableau-bord-comptable', 'TB Comptable', false, 9),
    (r_gestionnaire, 'configuration', 'Configuration', false, 10),
    (r_gestionnaire, 'admin', 'Administration', false, 11),
    (r_gestionnaire, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Revoque: aucun menu
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_revoque, 'dashboard', 'Tableau de Bord', false, 1),
    (r_revoque, 'eleves', 'Eleves', false, 2),
    (r_revoque, 'paiements', 'Paiements', false, 3),
    (r_revoque, 'finances', 'Finances', false, 4),
    (r_revoque, 'fournitures-eleves', 'Fournitures Eleves', false, 5),
    (r_revoque, 'fournitures-bureau', 'Fournitures Bureau', false, 6),
    (r_revoque, 'stock-uniformes', 'Stock Uniformes', false, 7),
    (r_revoque, 'rapports', 'Rapports', false, 8),
    (r_revoque, 'tableau-bord-comptable', 'TB Comptable', false, 9),
    (r_revoque, 'configuration', 'Configuration', false, 10),
    (r_revoque, 'admin', 'Administration', false, 11),
    (r_revoque, 'chat', 'Messages', false, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;
END $$;

-- >>> 20260703181424_add_promoteur_role.sql
/*
# Add Promoteur Role

## Summary
Adds a new "promoteur" role with elevated permissions.

## Changes
1. New role inserted into `roles` table:
   - `nom`: 'promoteur'
   - `permissions`: {"all": true, "can_approve": true, "can_encaisser": true, "can_view_dashboard": true, "can_export": true}
   - `description`: Promoteur - Full access with unlimited transaction approval and encaissement

## Notes
- The Promoteur can approve ALL transactions regardless of amount (no cap)
- The Promoteur can encaisser/decaisser transactions including those with montant 0
- The Promoteur has full visibility on all pages
- The Promoteur is NOT read-only (unlike coordonnateur)
*/

INSERT INTO roles (nom, permissions, description)
SELECT 'promoteur', '{"all": true, "can_approve": true, "can_encaisser": true, "can_view_dashboard": true, "can_export": true}'::jsonb, 'Promoteur - Accès complet avec approbation et encaissement illimités'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE nom = 'promoteur'
);
-- >>> 20260703184701_add_promoteur_coordonnateur_to_compte_courant_policy.sql
/*
# Add promoteur and coordonnateur to compte_courant RLS policy

## Summary
Updates the RLS policy on `compte_courant` to allow the `promoteur` and `coordonnateur`
roles to manage (SELECT, INSERT, UPDATE, DELETE) records in the compte_courant table.

## Changes
1. Modified policy: "Comptables et admins peuvent gérer le compte courant"
   - Previously allowed: admin, comptable, directeur, it_manager, secretaire
   - Now also allows: promoteur, coordonnateur

## Security
- The promoteur role gets full CRUD access (can approve all transactions without limit)
- The coordonnateur role gets full CRUD access at database level (frontend limits approval to <= 300,000 FC)

## Important Notes
1. This fixes the issue where promoteur and coordonnateur could see the approve button
   in the frontend but the UPDATE was rejected by the database RLS policy.
2. The frontend already enforces the 300k approval cap for coordonnateur.
*/

DROP POLICY IF EXISTS "Comptables et admins peuvent gérer le compte courant" ON compte_courant;

CREATE POLICY "Comptables et admins peuvent gérer le compte courant"
  ON compte_courant FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'directeur', 'it_manager', 'secretaire', 'promoteur', 'coordonnateur'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'directeur', 'it_manager', 'secretaire', 'promoteur', 'coordonnateur'])
    )
  );
-- >>> 20260703185352_add_promoteur_menu_visibility_seed.sql
/*
# Seed menu_visibility for the Promoteur role

## Summary
Inserts default menu_visibility rows for the "promoteur" role so that the
menu configuration system can manage its visible pages, just like all
other roles.

## Changes
1. Inserts 12 menu items for the promoteur role with default visibility:
   - All menus visible by default (promoteur has full access)
   - Uses ON CONFLICT DO NOTHING to be idempotent

## Notes
- The promoteur can now be configured via the Menu Config tab in Configuration
- Admins/IT Managers can hide specific menus from the promoteur if needed
- By default the promoteur sees everything (similar to admin)
*/

DO $$
DECLARE
  r_promoteur uuid;
BEGIN
  SELECT id INTO r_promoteur FROM roles WHERE nom = 'promoteur';

  IF r_promoteur IS NOT NULL THEN
    INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
      (r_promoteur, 'dashboard', 'Tableau de Bord', true, 1),
      (r_promoteur, 'eleves', 'Eleves', true, 2),
      (r_promoteur, 'paiements', 'Paiements', true, 3),
      (r_promoteur, 'finances', 'Finances', true, 4),
      (r_promoteur, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
      (r_promoteur, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
      (r_promoteur, 'stock-uniformes', 'Stock Uniformes', true, 7),
      (r_promoteur, 'rapports', 'Rapports', true, 8),
      (r_promoteur, 'tableau-bord-comptable', 'TB Comptable', true, 9),
      (r_promoteur, 'configuration', 'Configuration', true, 10),
      (r_promoteur, 'admin', 'Administration', false, 11),
      (r_promoteur, 'chat', 'Messages', true, 12)
    ON CONFLICT (role_id, menu_key) DO NOTHING;
  END IF;
END $$;
-- >>> 20260703190202_add_nom_encaisseur_to_compte_courant.sql
/*
# Add nom_encaisseur column to compte_courant

## Summary
Adds a new column to track who performed the encaissement or decaissement
of a transaction (the person who clicked "Encaisser" or "Decaisser").

## Modified Tables
- `compte_courant`
  - `nom_encaisseur` (text, nullable) - Full name of the user who encaissed/decaissed the transaction

## Notes
1. This is separate from `nom_comptable` (who created the transaction) and
   `nom_approbateur` (who approved it).
2. The value is set by the frontend when the status changes to 'encaisse' or 'decaisse'.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compte_courant' AND column_name = 'nom_encaisseur'
  ) THEN
    ALTER TABLE compte_courant ADD COLUMN nom_encaisseur text;
  END IF;
END $$;
-- >>> 20260705075921_add_promoteur_coordonnateur_to_paiements_select_policy.sql
/*
# Grant read-only access to paiements for promoteur and coordonnateur

## Summary
Adds promoteur and coordonnateur roles to the SELECT policy on the paiements table
so they can view all payment data in the application (Paiements page and Tableau de Bord Comptable).

## Modified Policies
- `paiements` table SELECT policy: added 'promoteur' and 'coordonnateur' to the allowed roles array

## Security
- Read-only access only (no INSERT, UPDATE, or DELETE changes)
- These roles can view all payment data but cannot modify anything
*/

DROP POLICY IF EXISTS "Authenticated users with payment permission can view paiements" ON paiements;
CREATE POLICY "Authenticated users with payment permission can view paiements"
ON paiements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    AND r.nom = ANY (ARRAY['admin', 'comptable', 'secretaire', 'directeur', 'it_manager', 'promoteur', 'coordonnateur'])
  )
);
-- >>> 20260805120000_add_public_parent_portal_access.sql
/*
# Add public read access for parent portal

## Summary
Adds a public SELECT policy on the paiements table so the Portail Parent
can fetch payment history without authentication.

## Tables affected
- paiements: new SELECT policy for anonymous users
*/

-- Allow anonymous (public) reads on paiements for the parent portal
DROP POLICY IF EXISTS "Public can view paiements for parent portal" ON paiements;
CREATE POLICY "Public can view paiements for parent portal"
  ON paiements FOR SELECT
  TO anon
  USING (true);

-- Also ensure eleves has public read access (it already has USING(true) but double-check)
DROP POLICY IF EXISTS "Public can view eleves for parent portal" ON eleves;
CREATE POLICY "Public can view eleves for parent portal"
  ON eleves FOR SELECT
  TO anon
  USING (true);

-- >>> 20260805130000_add_portail_professeur.sql
/*
# Add Portail Professeur — enseignant role, cours & devoirs tables

## Summary
- New role: `enseignant`
- New tables: `cours`, `devoirs`
- Storage bucket: `cours-files` for uploaded course materials
- RLS policies for authenticated enseignant access
*/

-- 1. Add enseignant role
INSERT INTO roles (nom, permissions, description)
SELECT 'enseignant', '{"can_view_dashboard": true}'::jsonb, 'Enseignant - Accès au portail professeur'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nom = 'enseignant');

-- 2. Create cours table
CREATE TABLE IF NOT EXISTS cours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  description text DEFAULT '',
  professeur_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classe_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  fichier_url text,
  fichier_nom text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create devoirs table
CREATE TABLE IF NOT EXISTS devoirs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  description text DEFAULT '',
  professeur_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classe_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  cours_id uuid REFERENCES cours(id) ON DELETE SET NULL,
  date_limite timestamptz,
  fichier_url text,
  fichier_nom text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. RLS policies for cours
ALTER TABLE cours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enseignants can view all cours" ON cours
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enseignants can create cours" ON cours
  FOR INSERT TO authenticated
  WITH CHECK (professeur_id = auth.uid());

CREATE POLICY "Enseignants can update own cours" ON cours
  FOR UPDATE TO authenticated
  USING (professeur_id = auth.uid())
  WITH CHECK (professeur_id = auth.uid());

CREATE POLICY "Enseignants can delete own cours" ON cours
  FOR DELETE TO authenticated
  USING (professeur_id = auth.uid());

-- 5. RLS policies for devoirs
ALTER TABLE devoirs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enseignants can view all devoirs" ON devoirs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enseignants can create devoirs" ON devoirs
  FOR INSERT TO authenticated
  WITH CHECK (professeur_id = auth.uid());

CREATE POLICY "Enseignants can update own devoirs" ON devoirs
  FOR UPDATE TO authenticated
  USING (professeur_id = auth.uid())
  WITH CHECK (professeur_id = auth.uid());

CREATE POLICY "Enseignants can delete own devoirs" ON devoirs
  FOR DELETE TO authenticated
  USING (professeur_id = auth.uid());

-- 6. Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE cours;
ALTER PUBLICATION supabase_realtime ADD TABLE devoirs;

-- 7. Add enseignant to menu_visibility
INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre)
SELECT id, 'portail-professeur', 'Portail Professeur', true, 9
FROM roles WHERE nom = 'enseignant'
ON CONFLICT (role_id, menu_key) DO NOTHING;

-- >>> 20260805140000_add_section_option_to_cours_devoirs.sql
-- Add section_id and option_id to cours and devoirs tables
ALTER TABLE cours ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES sections(id) ON DELETE SET NULL;
ALTER TABLE cours ADD COLUMN IF NOT EXISTS option_id uuid REFERENCES options(id) ON DELETE SET NULL;
ALTER TABLE devoirs ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES sections(id) ON DELETE SET NULL;
ALTER TABLE devoirs ADD COLUMN IF NOT EXISTS option_id uuid REFERENCES options(id) ON DELETE SET NULL;

-- >>> 20260805150000_create_cours_files_bucket.sql
-- Create storage bucket for course files
-- Run this in Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cours-files', 'cours-files', true, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cours-files');

-- Allow public read access
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'cours-files');

-- >>> 20260805160000_add_public_cours_devoirs_access.sql
-- Allow public (anon) read access to cours and devoirs for the parent/student portal
DROP POLICY IF EXISTS "Public can view cours" ON cours;
CREATE POLICY "Public can view cours" ON cours
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can view devoirs" ON devoirs;
CREATE POLICY "Public can view devoirs" ON devoirs
  FOR SELECT TO anon USING (true);

-- >>> 20260806150000_add_audit_trail.sql
/*
  # Add Audit Trail

  Creates audit_logs table and triggers on critical tables to track
  who did what and when. Compliant with financial accountability requirements.

  Tables tracked: compte_courant, paiements, eleves
*/

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and it_manager can view audit logs
CREATE POLICY "Admins and IT managers can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'it_manager')
    )
  );

-- Trigger function
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), user_id);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), user_id);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), user_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_compte_courant') THEN
    CREATE TRIGGER audit_compte_courant AFTER INSERT OR UPDATE OR DELETE ON compte_courant FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_paiements') THEN
    CREATE TRIGGER audit_paiements AFTER INSERT OR UPDATE OR DELETE ON paiements FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_eleves') THEN
    CREATE TRIGGER audit_eleves AFTER INSERT OR UPDATE OR DELETE ON eleves FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;
END
$$;
