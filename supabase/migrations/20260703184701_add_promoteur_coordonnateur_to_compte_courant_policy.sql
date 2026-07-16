/*
# Add promoteur and coordonnateur to compte_courant RLS policy

## Summary
Updates the RLS policy on `compte_courant` to allow the `promoteur` and `coordonnateur`
roles to manage (SELECT, INSERT, UPDATE, DELETE) records in the compte_courant table.

## Changes
1. Modified policy: "Comptables et admins peuvent gérer le compte courant"
   - Previously allowed: admin, comptable, directeur, it_manager, secretaire
   - Now also allows: promoteur, coordonnateur

## Security
- The promoteur role gets full CRUD access (can approve all transactions without limit)
- The coordonnateur role gets full CRUD access at database level (frontend limits approval to <= 300,000 FC)

## Important Notes
1. This fixes the issue where promoteur and coordonnateur could see the approve button
   in the frontend but the UPDATE was rejected by the database RLS policy.
2. The frontend already enforces the 300k approval cap for coordonnateur.
*/

DROP POLICY IF EXISTS "Comptables et admins peuvent gérer le compte courant" ON compte_courant;

CREATE POLICY "Comptables et admins peuvent gérer le compte courant"
  ON compte_courant FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'directeur', 'it_manager', 'secretaire', 'promoteur', 'coordonnateur'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
        AND r.nom = ANY(ARRAY['admin', 'comptable', 'directeur', 'it_manager', 'secretaire', 'promoteur', 'coordonnateur'])
    )
  );