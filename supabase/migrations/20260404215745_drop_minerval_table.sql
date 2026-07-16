/*
  # Drop Minerval Table

  1. Changes
    - Drop the `minerval` table as it has been replaced by the unified `paiements` table
    - This migration consolidates all payment tracking into a single table for better data management

  2. Notes
    - This is a destructive operation
    - Make sure all data has been migrated to the paiements table before running
    - All references to minerval should now point to paiements
*/

-- Drop the minerval table if it exists
DROP TABLE IF EXISTS minerval CASCADE;