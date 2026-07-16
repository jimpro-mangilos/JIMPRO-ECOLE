/*
# Grant read-only access to paiements for promoteur and coordonnateur

## Summary
Adds promoteur and coordonnateur roles to the SELECT policy on the paiements table
so they can view all payment data in the application (Paiements page and Tableau de Bord Comptable).

## Modified Policies
- `paiements` table SELECT policy: added 'promoteur' and 'coordonnateur' to the allowed roles array

## Security
- Read-only access only (no INSERT, UPDATE, or DELETE changes)
- These roles can view all payment data but cannot modify anything
*/

DROP POLICY IF EXISTS "Authenticated users with payment permission can view paiements" ON paiements;
CREATE POLICY "Authenticated users with payment permission can view paiements"
ON paiements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    AND r.nom = ANY (ARRAY['admin', 'comptable', 'secretaire', 'directeur', 'it_manager', 'promoteur', 'coordonnateur'])
  )
);