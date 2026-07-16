/*
  # Add classe field to eleves table

  1. Changes
    - Add `classe` column to `eleves` table
      - Type: text
      - Nullable: yes
      - Description: Stores the class/grade of the student (e.g., "5ème A", "1ère Scientifique")
  
  2. Notes
    - This field complements the section and option fields
    - Allows more specific class designation beyond section/option
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eleves' AND column_name = 'classe'
  ) THEN
    ALTER TABLE eleves ADD COLUMN classe text;
  END IF;
END $$;