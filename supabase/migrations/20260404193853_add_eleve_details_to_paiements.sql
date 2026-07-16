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
