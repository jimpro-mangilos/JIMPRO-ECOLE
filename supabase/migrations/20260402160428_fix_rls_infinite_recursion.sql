/*
  # Correction de la récursion infinie dans les politiques RLS

  ## Description
  Ce correctif résout l'erreur "infinite recursion detected in policy" qui empêche
  la connexion des utilisateurs. Le problème venait de politiques RLS circulaires
  entre les tables `profiles` et `roles`.

  ## Problème résolu
  - Les politiques sur `profiles` référençaient `roles` avec une jointure
  - Les politiques sur `roles` référençaient `profiles` avec une jointure
  - Cela créait une récursion infinie lors des requêtes

  ## Solution
  - Simplification des politiques pour éviter les dépendances circulaires
  - Permettre à tous les utilisateurs authentifiés de lire les tables nécessaires
  - Restreindre uniquement les opérations de modification

  ## Modifications
  1. Suppression des anciennes politiques problématiques
  2. Création de nouvelles politiques simplifiées et sécurisées
*/

-- Suppression de toutes les politiques existantes sur profiles et roles
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leur propre profil" ON profiles;
DROP POLICY IF EXISTS "Admins peuvent voir tous les profils" ON profiles;
DROP POLICY IF EXISTS "Utilisateurs peuvent mettre à jour leur propre profil" ON profiles;
DROP POLICY IF EXISTS "Admins peuvent gérer tous les profils" ON profiles;

DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les rôles" ON roles;
DROP POLICY IF EXISTS "Seuls les admins peuvent gérer les rôles" ON roles;

-- ========================================
-- POLITIQUES POUR LA TABLE PROFILES
-- ========================================

-- Lecture: Tous les utilisateurs authentifiés peuvent lire tous les profils
-- (nécessaire pour les vérifications de permissions et affichage)
CREATE POLICY "Lecture des profils pour utilisateurs authentifiés"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Mise à jour: Les utilisateurs peuvent uniquement modifier leur propre profil
CREATE POLICY "Utilisateurs peuvent modifier leur profil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Insertion: Géré par le trigger handle_new_user(), permettre l'insertion
CREATE POLICY "Permettre insertion de profils"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Suppression: Interdit aux utilisateurs normaux
-- (seul le service role peut supprimer, pas de politique = accès refusé)

-- ========================================
-- POLITIQUES POUR LA TABLE ROLES
-- ========================================

-- Lecture: Tous les utilisateurs authentifiés peuvent lire les rôles
-- (nécessaire pour afficher les rôles dans l'interface)
CREATE POLICY "Lecture des rôles pour utilisateurs authentifiés"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Modification: Interdit aux utilisateurs normaux
-- (seul le service role peut modifier, pas de politique = accès refusé)

-- ========================================
-- POLITIQUES POUR LES AUTRES TABLES
-- ========================================

-- Suppression des anciennes politiques sections
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les sections" ON sections;
DROP POLICY IF EXISTS "Seuls les admins peuvent gérer les sections" ON sections;

-- Nouvelles politiques pour sections
CREATE POLICY "Lecture des sections"
  ON sections FOR SELECT
  TO authenticated
  USING (true);

-- Suppression des anciennes politiques options
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les options" ON options;
DROP POLICY IF EXISTS "Seuls les admins peuvent gérer les options" ON options;

-- Nouvelles politiques pour options
CREATE POLICY "Lecture des options"
  ON options FOR SELECT
  TO authenticated
  USING (true);

-- Commentaires
COMMENT ON POLICY "Lecture des profils pour utilisateurs authentifiés" ON profiles IS 
  'Permet à tous les utilisateurs authentifiés de lire les profils sans récursion';

COMMENT ON POLICY "Lecture des rôles pour utilisateurs authentifiés" ON roles IS 
  'Permet à tous les utilisateurs authentifiés de lire les rôles sans récursion';
