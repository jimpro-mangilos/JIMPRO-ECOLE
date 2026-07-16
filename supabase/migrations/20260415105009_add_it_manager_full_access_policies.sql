/*
  # IT Manager Full Access Policies

  ## Summary
  Grant the it_manager role complete access across all tables, equivalent to a super-admin.

  ## Changes
  1. Fix wrong casing 'IT_MANAGER' -> 'it_manager' in notifications_log policy
  2. Add it_manager to all table policies where admin-only access existed:
     - classes (UPDATE, DELETE)
     - eleves (ALL manage)
     - options (UPDATE, DELETE)
     - sections (UPDATE, DELETE)
     - motifs_paiement (SELECT, UPDATE, DELETE)
     - paiements (SELECT, DELETE)
     - annees_scolaires (DELETE)
     - gestion_fournitures and gestion_fourniture_bureau
     - compte_courant
  3. Add it_manager to user_activity_logs if present
*/

-- Fix notifications_log wrong casing
DROP POLICY IF EXISTS "Authorized users can view notifications" ON notifications_log;
CREATE POLICY "Authorized users can view notifications"
  ON notifications_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager', 'comptable'])
    )
  );

-- classes: add it_manager to UPDATE and DELETE
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier des classes" ON classes;
CREATE POLICY "Seuls les admins peuvent modifier des classes"
  ON classes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Seuls les admins peuvent supprimer des classes" ON classes;
CREATE POLICY "Seuls les admins peuvent supprimer des classes"
  ON classes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- eleves: add it_manager to manage
DROP POLICY IF EXISTS "Secrétaires et admins peuvent gérer les élèves" ON eleves;
CREATE POLICY "Secrétaires et admins peuvent gérer les élèves"
  ON eleves FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'secretaire', 'directeur', 'it_manager'])
    )
  );

-- options: add it_manager to UPDATE and DELETE
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier les options" ON options;
CREATE POLICY "Seuls les admins peuvent modifier les options"
  ON options FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Seuls les admins peuvent supprimer les options" ON options;
CREATE POLICY "Seuls les admins peuvent supprimer les options"
  ON options FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- sections: add it_manager
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier les sections" ON sections;
CREATE POLICY "Seuls les admins peuvent modifier les sections"
  ON sections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Seuls les admins peuvent supprimer les sections" ON sections;
CREATE POLICY "Seuls les admins peuvent supprimer les sections"
  ON sections FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- motifs_paiement: add it_manager to SELECT (admin-only view), UPDATE, DELETE
DROP POLICY IF EXISTS "Admins can view all motifs" ON motifs_paiement;
CREATE POLICY "Admins can view all motifs"
  ON motifs_paiement FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Admins can update motifs" ON motifs_paiement;
CREATE POLICY "Admins can update motifs"
  ON motifs_paiement FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Admins can delete motifs" ON motifs_paiement;
CREATE POLICY "Admins can delete motifs"
  ON motifs_paiement FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- paiements: add it_manager to SELECT and DELETE
DROP POLICY IF EXISTS "Authenticated users with payment permission can view paiements" ON paiements;
CREATE POLICY "Authenticated users with payment permission can view paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'secretaire', 'directeur', 'it_manager'])
    )
  );

DROP POLICY IF EXISTS "Only admins can delete paiements" ON paiements;
CREATE POLICY "Only admins can delete paiements"
  ON paiements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- paiements: add it_manager to ALL (admin policy)
DROP POLICY IF EXISTS "Admins can do everything on paiements" ON paiements;
CREATE POLICY "Admins can do everything on paiements"
  ON paiements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- annees_scolaires: add it_manager to DELETE
DROP POLICY IF EXISTS "Admins can delete school years" ON annees_scolaires;
CREATE POLICY "Admins can delete school years"
  ON annees_scolaires FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role_id IN (
          SELECT roles.id FROM roles WHERE roles.nom = ANY(ARRAY['admin', 'it_manager'])
        )
    )
  );

-- types_paiement: add it_manager to DELETE
DROP POLICY IF EXISTS "Admins can delete payment types" ON types_paiement;
CREATE POLICY "Admins can delete payment types"
  ON types_paiement FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role_id IN (
          SELECT roles.id FROM roles WHERE roles.nom = ANY(ARRAY['admin', 'it_manager'])
        )
    )
  );

-- gestion_fournitures: add it_manager
DROP POLICY IF EXISTS "Secrétaires et admins peuvent gérer les fournitures élèves" ON gestion_fournitures;
CREATE POLICY "Secrétaires et admins peuvent gérer les fournitures élèves"
  ON gestion_fournitures FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'secretaire', 'directeur', 'it_manager'])
    )
  );

-- gestion_fourniture_bureau: add it_manager
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent gérer les fournitures burea" ON gestion_fourniture_bureau;
CREATE POLICY "Utilisateurs authentifiés peuvent gérer les fournitures burea"
  ON gestion_fourniture_bureau FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'secretaire', 'comptable', 'directeur', 'it_manager'])
    )
  );

-- compte_courant: add it_manager
DROP POLICY IF EXISTS "Comptables et admins peuvent gérer le compte courant" ON compte_courant;
CREATE POLICY "Comptables et admins peuvent gérer le compte courant"
  ON compte_courant FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'directeur', 'it_manager'])
    )
  );
