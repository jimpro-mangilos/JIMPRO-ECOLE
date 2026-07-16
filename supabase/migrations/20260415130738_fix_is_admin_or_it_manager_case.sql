/*
  # Fix is_admin_or_it_manager function case mismatch

  ## Problem
  The function `is_admin_or_it_manager()` was checking for 'IT_MANAGER' (uppercase)
  but the actual role name stored in the `roles` table is 'it_manager' (lowercase).
  This caused RLS policy failures silently, blocking profile reads inside the
  delete-user edge function and returning 403 Forbidden.

  ## Changes
  - Updated the `is_admin_or_it_manager()` function to use lowercase 'it_manager'
    to match the actual value stored in the roles table.
*/

CREATE OR REPLACE FUNCTION public.is_admin_or_it_manager()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    INNER JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    AND r.nom IN ('admin', 'it_manager')
  );
END;
$$;
