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
