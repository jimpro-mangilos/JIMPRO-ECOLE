-- ============================================================
-- Fix: Admin/IT_Manager bypass RLS tenant-scoping
-- ============================================================
-- Problème : quand un admin switch d'école via le sélecteur,
--   get_current_ecole_id() retourne toujours son profiles.ecole_id
--   → RLS filtre sur l'ancienne école, pas la nouvelle.
-- Solution : admin/it_manager peuvent voir TOUTES les écoles.
--   Le filtre école côté frontend (via useActiveSchool) détermine
--   quelle école est affichée.
--   Les utilisateurs normaux restent scopés par RLS.
-- ============================================================

-- 1. Modifier get_current_ecole_id() pour retourner NULL si admin/it_manager
--    (NULL dans la politique RLS = pas de restriction)
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
  -- Vérifier si l'utilisateur est admin ou it_manager
  SELECT r.nom INTO user_role
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE p.id = auth.uid();

  -- Admin et IT Manager : pas de restriction d'école (retourne NULL)
  IF user_role IN ('admin', 'it_manager') THEN
    RETURN NULL;
  END IF;

  -- Utilisateurs normaux : retourner leur ecole_id
  SELECT ecole_id INTO result
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_current_ecole_id() IS
  'Retourne l''ecole_id du profil. Admin/it_manager retournent NULL (voient tout).';

-- 2. Recréer les politiques RLS pour gérer NULL (admin bypass)
--    Quand get_current_ecole_id() retourne NULL, la condition
--    "ecole_id = NULL" est toujours FALSE, donc il faut utiliser
--    "ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL"

-- Cette boucle met à jour toutes les politiques existantes
DO $$
DECLARE
  tbl record;
  pol record;
  has_ecole boolean;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('roles', 'user_activity_logs', 'chat_participants', 'chat_message_reads', 'menu_visibility', 'minerval')
    ORDER BY table_name
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl.table_name AND column_name = 'ecole_id'
    ) INTO has_ecole;

    IF NOT has_ecole THEN CONTINUE; END IF;

    -- Supprimer et recréer chaque politique avec le bypass admin
    FOR pol IN
      SELECT policyname, cmd FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl.table_name
        AND policyname LIKE 'Users can%'
    LOOP
      -- SELECT policy
      IF pol.cmd = 'SELECT' THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, 'public', tbl.table_name);
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR SELECT TO authenticated USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)',
          pol.policyname, 'public', tbl.table_name
        );
      -- INSERT policy
      ELSIF pol.cmd = 'INSERT' THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, 'public', tbl.table_name);
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR INSERT TO authenticated WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)',
          pol.policyname, 'public', tbl.table_name
        );
      -- UPDATE policy
      ELSIF pol.cmd = 'UPDATE' THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, 'public', tbl.table_name);
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR UPDATE TO authenticated USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)',
          pol.policyname, 'public', tbl.table_name
        );
      -- DELETE policy
      ELSIF pol.cmd = 'DELETE' THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, 'public', tbl.table_name);
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR DELETE TO authenticated USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)',
          pol.policyname, 'public', tbl.table_name
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 3. Même chose pour les politiques spéciales (chat, app_settings)
DROP POLICY IF EXISTS "School members can view conversations" ON chat_conversations;
CREATE POLICY "School members can view conversations" ON chat_conversations FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "School members can create conversations" ON chat_conversations;
CREATE POLICY "School members can create conversations" ON chat_conversations FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "School members can view messages" ON chat_messages;
CREATE POLICY "School members can view messages" ON chat_messages FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "School members can send messages" ON chat_messages;
CREATE POLICY "School members can send messages" ON chat_messages FOR INSERT TO authenticated
  WITH CHECK ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND sender_id = auth.uid());

DROP POLICY IF EXISTS "School members can update own messages" ON chat_messages;
CREATE POLICY "School members can update own messages" ON chat_messages FOR UPDATE TO authenticated
  USING ((ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL) AND sender_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can view app_settings" ON app_settings;
CREATE POLICY "Authenticated users can view app_settings" ON app_settings FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- 4. Profiles : admin peut voir/modifier tous les profils
DROP POLICY IF EXISTS "Users can view school profiles" ON profiles;
CREATE POLICY "Users can view school profiles" ON profiles FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL OR id = auth.uid());

DROP POLICY IF EXISTS "Users can delete profile" ON profiles;
CREATE POLICY "Users can delete profile" ON profiles FOR DELETE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "Users can insert profile" ON profiles;
CREATE POLICY "Users can insert profile" ON profiles FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- ============================================================
-- Récapitulatif
-- ============================================================
-- get_current_ecole_id() modifiée : admin/it_manager → NULL (voient tout)
-- Toutes les politiques RLS mises à jour : "ecole_id = X OR X IS NULL"
-- Données perdues : 0
-- ============================================================
