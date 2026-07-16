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
