-- ============================================================
-- Fix: le rôle "promoteur" doit aussi contourner le scoping RLS
-- par école, car l'UI (useActiveSchool) l'autorise à basculer
-- d'école (au même titre que admin/it_manager).
-- Sinon, une fois basculé vers une autre école, le promoteur ne
-- voyait plus ses données ni le logo de l'école active.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_ecole_id()
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result uuid;
  user_role text;
BEGIN
  SELECT r.nom INTO user_role
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();

  -- Admin, IT Manager et Promoteur : pas de restriction d'école (retourne NULL)
  IF user_role IN ('admin', 'it_manager', 'promoteur') THEN
    RETURN NULL;
  END IF;

  SELECT ecole_id INTO result
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN result;
END;
$$;
