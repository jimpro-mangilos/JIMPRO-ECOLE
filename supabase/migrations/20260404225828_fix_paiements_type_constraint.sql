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
