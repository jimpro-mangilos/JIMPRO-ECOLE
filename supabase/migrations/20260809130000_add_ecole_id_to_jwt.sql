-- ============================================================
-- Phase 2: Multi-École — Injection ecole_id dans le JWT (app_metadata)
-- ============================================================
-- Stratégie :
--   1. Sync profiles.ecole_id → auth.users.raw_app_meta_data via trigger
--      → ecole_id apparaît automatiquement dans le JWT access token
--      → lisible côté frontend via user.app_metadata.ecole_id
--      → utilisable dans les RLS policies via auth.jwt()->>'ecole_id'
--   2. Mise à jour de handle_new_user() pour accepter ecole_id optionnel
--   3. Fonction helper get_current_ecole_id() pour les politiques RLS
--   4. Backfill des utilisateurs existants
-- ============================================================

-- --------------------------------------------------
-- 1. Fonction de synchronisation profiles → auth.users
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_ecole_id_to_app_metadata()
RETURNS trigger
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  target_ecole_code text;
BEGIN
  -- Récupérer le code de l'école correspondante
  SELECT code INTO target_ecole_code
  FROM public.ecoles
  WHERE id = NEW.ecole_id;

  -- Mettre à jour raw_app_meta_data de l'utilisateur auth
  -- Cela injecte ecole_id ET ecole_code dans le JWT
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'ecole_id', NEW.ecole_id,
      'ecole_code', COALESCE(target_ecole_code, '')
    )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_ecole_id_to_app_metadata() IS
  'Synchronise profiles.ecole_id vers auth.users.raw_app_meta_data pour inclusion dans le JWT';

-- --------------------------------------------------
-- 2. Trigger sur profiles : INSERT ou UPDATE de ecole_id
-- --------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_ecole_id_jwt ON public.profiles;

CREATE TRIGGER trg_sync_ecole_id_jwt
  AFTER INSERT OR UPDATE OF ecole_id ON public.profiles
  FOR EACH ROW
  WHEN (NEW.ecole_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_ecole_id_to_app_metadata();

-- --------------------------------------------------
-- 3. Mise à jour de handle_new_user() avec support ecole_id
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_nom text;
  v_prenom text;
  v_role_id uuid;
  v_ecole_id uuid;
BEGIN
  -- Rôle par défaut : revoque
  SELECT id INTO v_role_id FROM public.roles WHERE nom = 'revoque' LIMIT 1;

  -- Métadonnées utilisateur
  v_nom := COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1));
  v_prenom := COALESCE(NEW.raw_user_meta_data->>'prenom', '');

  -- École : soit spécifiée dans les métadonnées, soit celle par défaut (CSGA)
  IF NEW.raw_user_meta_data->>'ecole_id' IS NOT NULL THEN
    v_ecole_id := (NEW.raw_user_meta_data->>'ecole_id')::uuid;
  ELSE
    -- École par défaut : C.S_GOLDEN_ACADEMY
    SELECT id INTO v_ecole_id FROM public.ecoles WHERE code = 'CSGA' LIMIT 1;
  END IF;

  -- Insertion du profil avec ecole_id
  INSERT INTO public.profiles (
    id, email, nom, prenom, role_id, ecole_id, is_active
  )
  VALUES (
    NEW.id, NEW.email, v_nom, v_prenom, v_role_id, v_ecole_id, true
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur création profil pour %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Crée automatiquement un profil utilisateur avec ecole_id (défaut: CSGA) lors de l''inscription';

-- --------------------------------------------------
-- 4. Fonction helper pour les politiques RLS (Phase 4)
-- --------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_ecole_id()
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result uuid;
BEGIN
  SELECT ecole_id INTO result
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_current_ecole_id() IS
  'Retourne l''ecole_id du profil de l''utilisateur connecté. Utilisable dans les RLS policies.';

-- --------------------------------------------------
-- 5. Backfill : synchroniser tous les profils existants
-- --------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.id, p.ecole_id, e.code AS ecole_code
    FROM public.profiles p
    LEFT JOIN public.ecoles e ON e.id = p.ecole_id
    WHERE p.ecole_id IS NOT NULL
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object(
        'ecole_id', r.ecole_id,
        'ecole_code', COALESCE(r.ecole_code, '')
      )
    WHERE id = r.id;
  END LOOP;
END $$;

-- ============================================================
-- Récapitulatif
-- ============================================================
-- Fonctions créées : 2 (sync_ecole_id_to_app_metadata, get_current_ecole_id)
-- Trigger créé     : 1 (trg_sync_ecole_id_jwt sur profiles)
-- Fonction modifiée: 1 (handle_new_user → gère ecole_id)
-- Backfill         : ✅ tous les profils existants synchronisés
-- Données perdues  : 0
-- ============================================================
-- VÉRIFICATION après déploiement :
--   SELECT id, email, raw_app_meta_data FROM auth.users LIMIT 5;
--   → doit contenir "ecole_id" et "ecole_code" dans raw_app_meta_data
-- ============================================================
