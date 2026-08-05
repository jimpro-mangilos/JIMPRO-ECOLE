-- Add section_id and option_id to cours and devoirs tables
ALTER TABLE cours ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES sections(id) ON DELETE SET NULL;
ALTER TABLE cours ADD COLUMN IF NOT EXISTS option_id uuid REFERENCES options(id) ON DELETE SET NULL;
ALTER TABLE devoirs ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES sections(id) ON DELETE SET NULL;
ALTER TABLE devoirs ADD COLUMN IF NOT EXISTS option_id uuid REFERENCES options(id) ON DELETE SET NULL;
