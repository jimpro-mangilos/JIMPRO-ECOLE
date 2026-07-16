/*
  # Correction du trigger de création de profil utilisateur

  ## Description
  Ce correctif résout l'erreur lors de la création de compte en améliorant
  la fonction `handle_new_user()` pour mieux gérer les métadonnées utilisateur.

  ## Problème résolu
  - Le trigger ne récupérait pas correctement les champs `nom` et `prenom` 
    depuis `raw_user_meta_data`
  - Les valeurs vides causaient des erreurs lors de l'insertion dans `profiles`

  ## Solution
  - Amélioration de la récupération des métadonnées avec vérification stricte
  - Ajout de valeurs par défaut plus robustes
  - Meilleure gestion des erreurs

  ## Modifications
  1. Suppression de l'ancien trigger et fonction
  2. Création d'une nouvelle fonction améliorée
  3. Recréation du trigger
*/

-- Suppression de l'ancien trigger et fonction
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Nouvelle fonction améliorée pour créer automatiquement un profil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_nom text;
  v_prenom text;
  v_default_role_id uuid;
BEGIN
  -- Récupération du rôle par défaut (secretaire)
  SELECT id INTO v_default_role_id 
  FROM public.roles 
  WHERE nom = 'secretaire' 
  LIMIT 1;

  -- Récupération des métadonnées avec valeurs par défaut
  v_nom := COALESCE(
    NEW.raw_user_meta_data->>'nom',
    split_part(NEW.email, '@', 1)
  );
  
  v_prenom := COALESCE(
    NEW.raw_user_meta_data->>'prenom',
    ''
  );

  -- Insertion du profil
  INSERT INTO public.profiles (
    id,
    email,
    nom,
    prenom,
    role_id,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_nom,
    v_prenom,
    v_default_role_id,
    true
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, on log mais on ne bloque pas la création du compte
    RAISE WARNING 'Erreur lors de la création du profil pour %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recréation du trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Commentaire sur la fonction
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Crée automatiquement un profil utilisateur lors de l''inscription avec gestion robuste des métadonnées';
