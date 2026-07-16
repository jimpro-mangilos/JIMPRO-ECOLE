/*
  # Ajout de la permission d'encaissement pour IT_MANAGER

  ## Description
  Cette migration permet aux IT_MANAGER d'encaisser les paiements au même titre que les comptables et administrateurs.

  ## 1. Modifications des Politiques RLS
    - Mise à jour de la politique UPDATE pour inclure IT_MANAGER
    - Les IT_MANAGER peuvent maintenant encaisser les paiements (modifier est_encaisse et date_encaissement)

  ## 2. Sécurité
    - Maintien de la restriction: seuls admin, comptable et IT_MANAGER peuvent encaisser
    - Les secrétaires ne peuvent toujours pas encaisser
*/

-- Suppression de l'ancienne politique UPDATE
DROP POLICY IF EXISTS "Only comptables and admins can update paiements" ON paiements;

-- Policy: Les comptables, IT_MANAGER et admins peuvent encaisser (modifier est_encaisse)
CREATE POLICY "Comptables, IT_MANAGER and admins can update paiements"
  ON paiements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable', 'it_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable', 'it_manager')
    )
  );
