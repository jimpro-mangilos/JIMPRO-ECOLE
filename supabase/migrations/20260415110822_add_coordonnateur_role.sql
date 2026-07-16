/*
  # Add Coordonnateur Role

  ## Summary
  Adds a new "coordonnateur" role to the system with read-only access.

  ## Changes
  1. New role inserted into `roles` table:
     - `nom`: 'coordonnateur'
     - `permissions`: {"read_only": true, "can_view_dashboard": true, "can_export": true}
     - `description`: Read-only coordinator role with full visibility but no write access

  ## Notes
  - The coordonnateur can view all pages including the comptable dashboard and reports
  - The coordonnateur CANNOT create, edit, or delete any records
  - The coordonnateur CANNOT access Configuration or Administration pages (admin-only)
  - Export/download features remain accessible to the coordonnateur
*/

INSERT INTO roles (nom, permissions, description)
SELECT 'coordonnateur', '{"read_only": true, "can_view_dashboard": true, "can_export": true}'::jsonb, 'Coordinateur - Accès en lecture seule avec visibilité complète'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE nom = 'coordonnateur'
);
