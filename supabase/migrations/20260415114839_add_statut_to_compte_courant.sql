/*
  # Add statut column to compte_courant

  ## Summary
  Adds a workflow status field to financial transactions to support an approval and disbursement/collection workflow.

  ## Changes
  - `compte_courant` table:
    - New column `statut` (text) with allowed values: en_attente, approuve, decaisse, encaisse
    - Default value: 'en_attente' (all new transactions start as pending)

  ## Workflow
  1. New transaction created → statut = 'en_attente'
  2. Approved by admin/it_manager/coordonnateur → statut = 'approuve'
  3. For 'dépense': approved → 'decaisse' (by it_manager or comptable)
  4. For 'recette': approved → 'encaisse' (by it_manager or comptable)

  ## Security
  Existing RLS policies remain unchanged.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compte_courant' AND column_name = 'statut'
  ) THEN
    ALTER TABLE compte_courant
      ADD COLUMN statut text NOT NULL DEFAULT 'en_attente'
      CHECK (statut IN ('en_attente', 'approuve', 'decaisse', 'encaisse'));
  END IF;
END $$;
