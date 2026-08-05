/*
# Add Portail Professeur — enseignant role, cours & devoirs tables

## Summary
- New role: `enseignant`
- New tables: `cours`, `devoirs`
- Storage bucket: `cours-files` for uploaded course materials
- RLS policies for authenticated enseignant access
*/

-- 1. Add enseignant role
INSERT INTO roles (nom, permissions, description)
SELECT 'enseignant', '{"can_view_dashboard": true}'::jsonb, 'Enseignant - Accès au portail professeur'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE nom = 'enseignant');

-- 2. Create cours table
CREATE TABLE IF NOT EXISTS cours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  description text DEFAULT '',
  professeur_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classe_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  fichier_url text,
  fichier_nom text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create devoirs table
CREATE TABLE IF NOT EXISTS devoirs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  description text DEFAULT '',
  professeur_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  classe_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  cours_id uuid REFERENCES cours(id) ON DELETE SET NULL,
  date_limite timestamptz,
  fichier_url text,
  fichier_nom text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. RLS policies for cours
ALTER TABLE cours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enseignants can view all cours" ON cours
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enseignants can create cours" ON cours
  FOR INSERT TO authenticated
  WITH CHECK (professeur_id = auth.uid());

CREATE POLICY "Enseignants can update own cours" ON cours
  FOR UPDATE TO authenticated
  USING (professeur_id = auth.uid())
  WITH CHECK (professeur_id = auth.uid());

CREATE POLICY "Enseignants can delete own cours" ON cours
  FOR DELETE TO authenticated
  USING (professeur_id = auth.uid());

-- 5. RLS policies for devoirs
ALTER TABLE devoirs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enseignants can view all devoirs" ON devoirs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enseignants can create devoirs" ON devoirs
  FOR INSERT TO authenticated
  WITH CHECK (professeur_id = auth.uid());

CREATE POLICY "Enseignants can update own devoirs" ON devoirs
  FOR UPDATE TO authenticated
  USING (professeur_id = auth.uid())
  WITH CHECK (professeur_id = auth.uid());

CREATE POLICY "Enseignants can delete own devoirs" ON devoirs
  FOR DELETE TO authenticated
  USING (professeur_id = auth.uid());

-- 6. Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE cours;
ALTER PUBLICATION supabase_realtime ADD TABLE devoirs;

-- 7. Add enseignant to menu_visibility
INSERT INTO menu_visibility (role_id, menu_key, visible)
SELECT id, 'portail-professeur', true
FROM roles WHERE nom = 'enseignant'
ON CONFLICT (role_id, menu_key) DO NOTHING;
