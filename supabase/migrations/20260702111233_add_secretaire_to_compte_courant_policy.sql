-- Add secretaire role to compte_courant management policy
DROP POLICY IF EXISTS "Comptables et admins peuvent gérer le compte courant" ON compte_courant;

CREATE POLICY "Comptables et admins peuvent gérer le compte courant"
  ON compte_courant FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'directeur', 'it_manager', 'secretaire'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'directeur', 'it_manager', 'secretaire'])
    )
  );
