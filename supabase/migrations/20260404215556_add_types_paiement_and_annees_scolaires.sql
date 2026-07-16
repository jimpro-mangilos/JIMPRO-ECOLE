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