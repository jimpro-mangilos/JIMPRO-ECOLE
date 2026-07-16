/*
  # Add IT_MANAGER Role

  1. Changes
    - Add 'it_manager' role to the roles table
    - This role has permissions to manage configuration and encaissement

  2. Security
    - No RLS changes needed, existing policies will use this role
*/

-- Insert IT_MANAGER role
INSERT INTO roles (nom, description, permissions) VALUES
  ('it_manager', 'IT Manager - Gestion technique et configuration', '{"all": true}'::jsonb)
ON CONFLICT (nom) DO NOTHING;
