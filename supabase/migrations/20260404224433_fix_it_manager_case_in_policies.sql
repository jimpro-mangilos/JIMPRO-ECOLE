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
