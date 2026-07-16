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