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