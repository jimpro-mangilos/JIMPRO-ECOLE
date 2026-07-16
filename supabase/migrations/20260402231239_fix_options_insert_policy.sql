/*
  # Correction des politiques RLS pour la table options

  1. Problème identifié
    - La table options n'a pas de politique INSERT
    - Les administrateurs ne peuvent pas ajouter de nouvelles options

  2. Solution
    - Ajout d'une politique INSERT pour permettre aux administrateurs d'insérer des options
    - Ajout d'une politique INSERT pour la table sections si nécessaire

  3. Sécurité
    - Seuls les utilisateurs avec le rôle 'admin' peuvent insérer des options
    - Vérification via la jointure profiles -> roles
*/

-- Supprimer les anciennes politiques INSERT si elles existent
DROP POLICY IF EXISTS "Seuls les admins peuvent créer des options" ON options;
DROP POLICY IF EXISTS "Seuls les admins peuvent créer des sections" ON sections;

-- Ajouter la politique INSERT pour la table options
CREATE POLICY "Seuls les admins peuvent créer des options"
  ON options
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom = 'admin'
    )
  );

-- Ajouter la politique INSERT pour la table sections
CREATE POLICY "Seuls les admins peuvent créer des sections"
  ON sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() 
      AND r.nom = 'admin'
    )
  );