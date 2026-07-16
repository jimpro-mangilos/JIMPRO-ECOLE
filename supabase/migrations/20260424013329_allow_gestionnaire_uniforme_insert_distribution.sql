/*
  # Autoriser le rôle `gestionnaire_uniforme` à enregistrer une distribution

  ## Description
  Le rôle `gestionnaire_uniforme` est dédié à la gestion des uniformes.
  Il devait pouvoir enregistrer une distribution d'uniforme (insertion dans
  `gestion_uniformes`), mais la politique RLS d'insertion existante ne
  l'autorisait pas. Cette migration met à jour la politique INSERT pour
  inclure ce rôle.

  ## 1. Modifications
  - Suppression de la politique `Staff can insert gestion_uniformes`
  - Création d'une nouvelle politique INSERT identique mais ajoutant
    `gestionnaire_uniforme` à la liste des rôles autorisés

  ## 2. Notes Importantes
  - Les politiques SELECT, UPDATE et DELETE ne sont pas modifiées
  - La mise à jour / suppression reste réservée aux administrateurs et IT managers
*/

DROP POLICY IF EXISTS "Staff can insert gestion_uniformes" ON public.gestion_uniformes;

CREATE POLICY "Staff can insert gestion_uniformes"
  ON public.gestion_uniformes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager', 'secretaire', 'comptable', 'coordonnateur', 'gestionnaire_uniforme')
    )
  );
