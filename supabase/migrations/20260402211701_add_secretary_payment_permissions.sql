/*
  # Ajout des permissions de paiement pour les secrétaires

  ## Description
  Cette migration permet aux secrétaires d'ajouter des paiements mais les empêche d'encaisser.
  Seuls les comptables et administrateurs peuvent encaisser les paiements.

  ## 1. Modifications des Permissions
    - Mise à jour du rôle secrétaire pour inclure la permission "paiements"
    - Les secrétaires peuvent créer des paiements (INSERT)
    - Les secrétaires peuvent voir tous les paiements (SELECT)
    - Seuls les comptables et admins peuvent encaisser (UPDATE est_encaisse)

  ## 2. Nouvelles Politiques RLS
    - Politique SELECT pour secrétaires: voir tous les paiements
    - Politique INSERT pour secrétaires: créer des paiements
    - Politique UPDATE restrictive: seuls comptables/admins peuvent modifier est_encaisse
    - Séparation claire des responsabilités entre création et encaissement

  ## 3. Sécurité
    - Les secrétaires ne peuvent pas modifier le champ est_encaisse
    - Les secrétaires ne peuvent pas modifier le champ date_encaissement
    - L'encaissement reste une opération réservée aux rôles financiers
*/

-- Mise à jour des permissions pour le rôle secrétaire
UPDATE roles
SET permissions = '{"eleves": true, "minerval": true, "fournitures": true, "paiements": true}'::jsonb
WHERE nom = 'secretaire';

-- Suppression des anciennes politiques pour les recréer avec les bonnes permissions
DROP POLICY IF EXISTS "Comptables can view all paiements" ON paiements;
DROP POLICY IF EXISTS "Comptables can create paiements" ON paiements;
DROP POLICY IF EXISTS "Comptables can update their own paiements" ON paiements;

-- Policy: Les secrétaires, comptables, directeurs et admins peuvent voir tous les paiements
CREATE POLICY "Authenticated users with payment permission can view paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable', 'secretaire', 'directeur')
    )
  );

-- Policy: Les secrétaires, comptables et admins peuvent créer des paiements
CREATE POLICY "Secretaries and comptables can create paiements"
  ON paiements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable', 'secretaire')
    )
  );

-- Policy: Seuls les comptables et admins peuvent encaisser (modifier est_encaisse)
-- Cette politique permet la modification mais sera complétée par une vérification côté application
CREATE POLICY "Only comptables and admins can update paiements"
  ON paiements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom IN ('admin', 'comptable')
    )
  );
