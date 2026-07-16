/*
  # Fix Admin Permissions to Update User Roles

  ## Problem
  After fixing the infinite recursion issue in migration 20260402160428, admins lost the ability to modify other users' profiles, specifically the role_id field.

  ## Solution
  1. Create a secure helper function using SECURITY DEFINER to check admin status
     - This function bypasses RLS to avoid infinite recursion
     - It's protected by running in a secure context
  
  2. Add a new RLS policy for admins and IT managers
     - Allows admins and IT_MANAGER to update any profile
     - Uses the secure function to verify admin status
     - Works alongside the existing policy for users to update their own profiles

  ## Security
  - The SECURITY DEFINER function is intentionally simple and read-only
  - It only checks if the current user has an admin or IT_MANAGER role
  - The function has a fixed search_path to prevent security exploits
  
  ## Changes
  - New function: `is_admin_or_it_manager()` (SECURITY DEFINER)
  - New policy: "Admins et IT Managers peuvent modifier tous les profils"
*/

-- Create a secure helper function to check if current user is admin or IT manager
-- SECURITY DEFINER allows this function to bypass RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION is_admin_or_it_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles p
    INNER JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    AND r.nom IN ('admin', 'IT_MANAGER')
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_or_it_manager() TO authenticated;

-- Add policy allowing admins and IT managers to update all profiles
-- This works with OR logic alongside the existing "users can update their own profile" policy
CREATE POLICY "Admins et IT Managers peuvent modifier tous les profils"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin_or_it_manager())
  WITH CHECK (is_admin_or_it_manager());

-- Create an index to optimize the admin check query
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_roles_nom ON roles(nom);
