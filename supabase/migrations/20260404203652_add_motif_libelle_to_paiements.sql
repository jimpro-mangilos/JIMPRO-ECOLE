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
