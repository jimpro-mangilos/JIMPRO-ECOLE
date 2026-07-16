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
