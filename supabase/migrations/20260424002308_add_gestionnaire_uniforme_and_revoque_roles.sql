/*
  # Ajout des rôles Gestionnaire Uniforme et Révoqué

  ## Description
  Cette migration ajoute deux nouveaux rôles au système JIMPRO :
  - `gestionnaire_uniforme` : rôle dédié à la gestion des uniformes,
    avec accès limité aux onglets Élèves, Fournitures Élèves et Stock Uniformes (lecture seule des stocks)
  - `revoque` : rôle bloquant qui révoque tout accès aux fonctionnalités de l'application

  ## 1. Modifications
  - Insertion de deux nouveaux rôles dans la table `roles`
  - Les rôles utilisent `ON CONFLICT (nom) DO NOTHING` pour permettre la ré-exécution

  ## 2. Notes Importantes
  - Aucune nouvelle table n'est créée
  - Aucune politique RLS existante n'est modifiée
  - Les permissions sont stockées dans le champ jsonb `permissions` et interprétées côté application
*/

INSERT INTO roles (nom, description, permissions)
VALUES (
  'gestionnaire_uniforme',
  'Gestionnaire des uniformes - accès limité aux élèves, fournitures élèves et stocks uniformes en lecture',
  '{"eleves": true, "fournitures_eleves": true, "stock_uniformes_read": true}'::jsonb
)
ON CONFLICT (nom) DO NOTHING;

INSERT INTO roles (nom, description, permissions)
VALUES (
  'revoque',
  'Compte révoqué - aucun accès aux fonctionnalités de l application',
  '{}'::jsonb
)
ON CONFLICT (nom) DO NOTHING;
