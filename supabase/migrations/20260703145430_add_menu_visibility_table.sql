/*
# Ajout de la table menu_visibility pour la configuration du menu par role

1. Nouvelle Table
   - `menu_visibility`
     - `id` (uuid, cle primaire)
     - `role_id` (uuid, FK vers roles.id, ON DELETE CASCADE)
     - `menu_key` (text, identifiant unique du menu)
     - `label` (text, libelle affiche)
     - `is_visible` (boolean, defaut true)
     - `ordre` (integer, defaut 0)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
     - Contrainte UNIQUE sur (role_id, menu_key)

2. Securite
   - RLS active sur la table
   - SELECT pour tous les utilisateurs authentifies
   - INSERT/UPDATE/DELETE uniquement pour admin et it_manager

3. Donnees initiales
   - Insertion des menus par defaut pour chaque role existant
   - Basees sur la logique actuelle du Layout.tsx

4. Notes
   - Le role "revoque" n'a aucun menu visible
   - Le role "it_manager" a tous les menus visibles
   - L'ordre determine l'affichage dans la sidebar
*/

-- Table menu_visibility
CREATE TABLE IF NOT EXISTS menu_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  menu_key text NOT NULL,
  label text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  ordre integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role_id, menu_key)
);

-- Activer RLS
ALTER TABLE menu_visibility ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
DROP POLICY IF EXISTS "select_menu_visibility" ON menu_visibility;
CREATE POLICY "select_menu_visibility" ON menu_visibility FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_menu_visibility" ON menu_visibility;
CREATE POLICY "insert_menu_visibility" ON menu_visibility FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

DROP POLICY IF EXISTS "update_menu_visibility" ON menu_visibility;
CREATE POLICY "update_menu_visibility" ON menu_visibility FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

DROP POLICY IF EXISTS "delete_menu_visibility" ON menu_visibility;
CREATE POLICY "delete_menu_visibility" ON menu_visibility FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

-- Trigger pour mettre a jour updated_at
CREATE OR REPLACE FUNCTION update_menu_visibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_menu_visibility_updated_at ON menu_visibility;
CREATE TRIGGER trigger_menu_visibility_updated_at
  BEFORE UPDATE ON menu_visibility
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_visibility_updated_at();

-- Insertion des donnees initiales pour chaque role
-- Definition des menus disponibles
DO $$
DECLARE
  r_admin uuid;
  r_secretaire uuid;
  r_comptable uuid;
  r_directeur uuid;
  r_coordonnateur uuid;
  r_gestionnaire uuid;
  r_it_manager uuid;
  r_revoque uuid;
BEGIN
  SELECT id INTO r_admin FROM roles WHERE nom = 'admin';
  SELECT id INTO r_secretaire FROM roles WHERE nom = 'secretaire';
  SELECT id INTO r_comptable FROM roles WHERE nom = 'comptable';
  SELECT id INTO r_directeur FROM roles WHERE nom = 'directeur';
  SELECT id INTO r_coordonnateur FROM roles WHERE nom = 'coordonnateur';
  SELECT id INTO r_gestionnaire FROM roles WHERE nom = 'gestionnaire_uniforme';
  SELECT id INTO r_it_manager FROM roles WHERE nom = 'it_manager';
  SELECT id INTO r_revoque FROM roles WHERE nom = 'revoque';

  -- Admin: tous les menus visibles
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_admin, 'dashboard', 'Tableau de Bord', true, 1),
    (r_admin, 'eleves', 'Eleves', true, 2),
    (r_admin, 'paiements', 'Paiements', true, 3),
    (r_admin, 'finances', 'Finances', true, 4),
    (r_admin, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_admin, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_admin, 'stock-uniformes', 'Stock Uniformes', true, 7),
    (r_admin, 'rapports', 'Rapports', true, 8),
    (r_admin, 'tableau-bord-comptable', 'TB Comptable', true, 9),
    (r_admin, 'configuration', 'Configuration', true, 10),
    (r_admin, 'admin', 'Administration', true, 11),
    (r_admin, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- IT Manager: tous les menus visibles
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_it_manager, 'dashboard', 'Tableau de Bord', true, 1),
    (r_it_manager, 'eleves', 'Eleves', true, 2),
    (r_it_manager, 'paiements', 'Paiements', true, 3),
    (r_it_manager, 'finances', 'Finances', true, 4),
    (r_it_manager, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_it_manager, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_it_manager, 'stock-uniformes', 'Stock Uniformes', true, 7),
    (r_it_manager, 'rapports', 'Rapports', true, 8),
    (r_it_manager, 'tableau-bord-comptable', 'TB Comptable', true, 9),
    (r_it_manager, 'configuration', 'Configuration', true, 10),
    (r_it_manager, 'admin', 'Administration', true, 11),
    (r_it_manager, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Secretaire: pas admin, pas TB comptable, pas config
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_secretaire, 'dashboard', 'Tableau de Bord', true, 1),
    (r_secretaire, 'eleves', 'Eleves', true, 2),
    (r_secretaire, 'paiements', 'Paiements', true, 3),
    (r_secretaire, 'finances', 'Finances', true, 4),
    (r_secretaire, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_secretaire, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_secretaire, 'stock-uniformes', 'Stock Uniformes', true, 7),
    (r_secretaire, 'rapports', 'Rapports', true, 8),
    (r_secretaire, 'tableau-bord-comptable', 'TB Comptable', false, 9),
    (r_secretaire, 'configuration', 'Configuration', false, 10),
    (r_secretaire, 'admin', 'Administration', false, 11),
    (r_secretaire, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Comptable
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_comptable, 'dashboard', 'Tableau de Bord', true, 1),
    (r_comptable, 'eleves', 'Eleves', true, 2),
    (r_comptable, 'paiements', 'Paiements', true, 3),
    (r_comptable, 'finances', 'Finances', true, 4),
    (r_comptable, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_comptable, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_comptable, 'stock-uniformes', 'Stock Uniformes', false, 7),
    (r_comptable, 'rapports', 'Rapports', true, 8),
    (r_comptable, 'tableau-bord-comptable', 'TB Comptable', false, 9),
    (r_comptable, 'configuration', 'Configuration', false, 10),
    (r_comptable, 'admin', 'Administration', false, 11),
    (r_comptable, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Directeur
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_directeur, 'dashboard', 'Tableau de Bord', true, 1),
    (r_directeur, 'eleves', 'Eleves', true, 2),
    (r_directeur, 'paiements', 'Paiements', true, 3),
    (r_directeur, 'finances', 'Finances', true, 4),
    (r_directeur, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_directeur, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_directeur, 'stock-uniformes', 'Stock Uniformes', false, 7),
    (r_directeur, 'rapports', 'Rapports', true, 8),
    (r_directeur, 'tableau-bord-comptable', 'TB Comptable', false, 9),
    (r_directeur, 'configuration', 'Configuration', false, 10),
    (r_directeur, 'admin', 'Administration', false, 11),
    (r_directeur, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Coordonnateur: acces lecture + TB Comptable
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_coordonnateur, 'dashboard', 'Tableau de Bord', true, 1),
    (r_coordonnateur, 'eleves', 'Eleves', true, 2),
    (r_coordonnateur, 'paiements', 'Paiements', true, 3),
    (r_coordonnateur, 'finances', 'Finances', true, 4),
    (r_coordonnateur, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_coordonnateur, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
    (r_coordonnateur, 'stock-uniformes', 'Stock Uniformes', false, 7),
    (r_coordonnateur, 'rapports', 'Rapports', true, 8),
    (r_coordonnateur, 'tableau-bord-comptable', 'TB Comptable', true, 9),
    (r_coordonnateur, 'configuration', 'Configuration', false, 10),
    (r_coordonnateur, 'admin', 'Administration', false, 11),
    (r_coordonnateur, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Gestionnaire Uniforme: acces limite
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_gestionnaire, 'dashboard', 'Tableau de Bord', false, 1),
    (r_gestionnaire, 'eleves', 'Eleves', true, 2),
    (r_gestionnaire, 'paiements', 'Paiements', false, 3),
    (r_gestionnaire, 'finances', 'Finances', false, 4),
    (r_gestionnaire, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
    (r_gestionnaire, 'fournitures-bureau', 'Fournitures Bureau', false, 6),
    (r_gestionnaire, 'stock-uniformes', 'Stock Uniformes', true, 7),
    (r_gestionnaire, 'rapports', 'Rapports', false, 8),
    (r_gestionnaire, 'tableau-bord-comptable', 'TB Comptable', false, 9),
    (r_gestionnaire, 'configuration', 'Configuration', false, 10),
    (r_gestionnaire, 'admin', 'Administration', false, 11),
    (r_gestionnaire, 'chat', 'Messages', true, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;

  -- Revoque: aucun menu
  INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
    (r_revoque, 'dashboard', 'Tableau de Bord', false, 1),
    (r_revoque, 'eleves', 'Eleves', false, 2),
    (r_revoque, 'paiements', 'Paiements', false, 3),
    (r_revoque, 'finances', 'Finances', false, 4),
    (r_revoque, 'fournitures-eleves', 'Fournitures Eleves', false, 5),
    (r_revoque, 'fournitures-bureau', 'Fournitures Bureau', false, 6),
    (r_revoque, 'stock-uniformes', 'Stock Uniformes', false, 7),
    (r_revoque, 'rapports', 'Rapports', false, 8),
    (r_revoque, 'tableau-bord-comptable', 'TB Comptable', false, 9),
    (r_revoque, 'configuration', 'Configuration', false, 10),
    (r_revoque, 'admin', 'Administration', false, 11),
    (r_revoque, 'chat', 'Messages', false, 12)
  ON CONFLICT (role_id, menu_key) DO NOTHING;
END $$;
