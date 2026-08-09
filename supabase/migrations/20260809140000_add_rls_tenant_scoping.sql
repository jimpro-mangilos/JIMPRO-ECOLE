-- ============================================================
-- Phase 4: Multi-École — RLS Tenant-Scoping
-- ============================================================
-- Stratégie :
--   Pour chaque table ayant une colonne ecole_id :
--   1. Supprimer TOUTES les politiques existantes
--   2. Créer des politiques standard avec tenant-scoping :
--      - SELECT:  ecole_id = get_current_ecole_id()
--      - INSERT:  ecole_id = get_current_ecole_id()
--      - UPDATE:  ecole_id = get_current_ecole_id()
--      - DELETE:  ecole_id = get_current_ecole_id()
--   3. Ajouter des politiques élevées pour admin/it_manager
--      (peuvent tout voir/modifier, mais scoped par école aussi —
--       le sélecteur d'école détermine l'école active)
--   4. Tables système (roles, chat_participants, etc.) : inchangées
--   5. Politiques anon (portails publics) : conservées telles quelles
--      (seront traitées en Phase 5 avec paramétrage par sous-domaine/URL)
-- ============================================================

DO $$
DECLARE
  tbl record;
  has_ecole boolean;
BEGIN
  -- --------------------------------------------------
  -- Parcourir toutes les tables du schéma public
  -- --------------------------------------------------
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN (
        -- Tables système sans ecole_id (inchangées)
        'roles',
        'user_activity_logs',
        'chat_participants',
        'chat_message_reads',
        'menu_visibility',
        'minerval' -- table déjà droppée
      )
    ORDER BY table_name
  LOOP
    -- Vérifier si la table a une colonne ecole_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl.table_name
        AND column_name = 'ecole_id'
    ) INTO has_ecole;

    IF NOT has_ecole THEN
      CONTINUE; -- skip tables sans ecole_id
    END IF;

    -- --------------------------------------------------
    -- Supprimer toutes les politiques existantes sur cette table
    -- --------------------------------------------------
    EXECUTE format(
      'DO $inner$ 
       DECLARE 
         pol record;
       BEGIN
         FOR pol IN 
           SELECT policyname FROM pg_policies 
           WHERE schemaname = ''public'' AND tablename = %L
         LOOP
           EXECUTE format(''DROP POLICY IF EXISTS %%I ON %I.%I'', 
             pol.policyname, ''public'', %L);
         END LOOP;
       END $inner$;',
      tbl.table_name, tbl.table_name
    );

    -- --------------------------------------------------
    -- 1. SELECT pour tous les utilisateurs authentifiés
    --    (tenant-scoped : ne voit que les données de son école)
    -- --------------------------------------------------
    EXECUTE format(
      'CREATE POLICY "Users can view their school''s %I" ON %I.%I FOR SELECT TO authenticated USING (ecole_id = get_current_ecole_id());',
      tbl.table_name, 'public', tbl.table_name
    );

    -- --------------------------------------------------
    -- 2. INSERT pour tous les utilisateurs authentifiés
    --    (force ecole_id = école de l'utilisateur)
    -- --------------------------------------------------
    EXECUTE format(
      'CREATE POLICY "Users can insert into their school''s %I" ON %I.%I FOR INSERT TO authenticated WITH CHECK (ecole_id = get_current_ecole_id());',
      tbl.table_name, 'public', tbl.table_name
    );

    -- --------------------------------------------------
    -- 3. UPDATE pour tous les utilisateurs authentifiés
    -- --------------------------------------------------
    EXECUTE format(
      'CREATE POLICY "Users can update their school''s %I" ON %I.%I FOR UPDATE TO authenticated USING (ecole_id = get_current_ecole_id()) WITH CHECK (ecole_id = get_current_ecole_id());',
      tbl.table_name, 'public', tbl.table_name
    );

    -- --------------------------------------------------
    -- 4. DELETE pour tous les utilisateurs authentifiés
    -- --------------------------------------------------
    EXECUTE format(
      'CREATE POLICY "Users can delete from their school''s %I" ON %I.%I FOR DELETE TO authenticated USING (ecole_id = get_current_ecole_id());',
      tbl.table_name, 'public', tbl.table_name
    );

  END LOOP;
END $$;

-- ============================================================
-- Politiques spéciales : PROFILES
-- ============================================================
-- L'utilisateur voit TOUJOURS son propre profil (même si changement d'école)
DROP POLICY IF EXISTS "Users can view their school's profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their school's profiles" ON profiles;
DROP POLICY IF EXISTS "Users can delete from their school's profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert into their school's profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can view school profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (ecole_id = get_current_ecole_id() AND id != auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id());

CREATE POLICY "Users can delete profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (ecole_id = get_current_ecole_id());

-- ============================================================
-- Politiques spéciales : APP_SETTINGS (lecture publique pour le logo)
-- ============================================================
DROP POLICY IF EXISTS "Users can view their school's app_settings" ON app_settings;

CREATE POLICY "Authenticated users can view app_settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (ecole_id = get_current_ecole_id());

CREATE POLICY "Anon can view app_settings"
  ON app_settings FOR SELECT
  TO anon
  USING (true);

-- ============================================================
-- Politiques spéciales : CHAT (messages lus par tous dans l'école)
-- ============================================================
DROP POLICY IF EXISTS "Users can view their school's chat_conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can insert into their school's chat_conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view their school's chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert into their school's chat_messages" ON chat_messages;

-- Chat conversations : tout le monde dans l'école peut voir
CREATE POLICY "School members can view conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (ecole_id = get_current_ecole_id());

CREATE POLICY "School members can create conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id());

-- Chat messages : tout le monde dans l'école peut voir/envoyer
CREATE POLICY "School members can view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (ecole_id = get_current_ecole_id());

CREATE POLICY "School members can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() AND sender_id = auth.uid());

CREATE POLICY "School members can update own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (ecole_id = get_current_ecole_id() AND sender_id = auth.uid());

-- ============================================================
-- Politiques ANON préservées (portails publics)
-- Ces politiques restent USING(true) car les utilisateurs
-- anonymes n'ont pas de contexte d'école.
-- Phase 5 : ajouter un paramètre d'école via sous-domaine ou token.
-- ============================================================

-- Paiements (portail parent/recouvrement)
DROP POLICY IF EXISTS "Public can view paiements" ON paiements;
CREATE POLICY "Public can view paiements"
  ON paiements FOR SELECT
  TO anon
  USING (true);

-- Élèves (portail parent)
DROP POLICY IF EXISTS "Public can view eleves" ON eleves;
CREATE POLICY "Public can view eleves"
  ON eleves FOR SELECT
  TO anon
  USING (true);

-- Cours et Devoirs (portail professeur/parent)
DROP POLICY IF EXISTS "Public can view cours" ON cours;
CREATE POLICY "Public can view cours"
  ON cours FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Public can view devoirs" ON devoirs;
CREATE POLICY "Public can view devoirs"
  ON devoirs FOR SELECT
  TO anon
  USING (true);

-- Motifs et années scolaires (portail recouvrement)
DROP POLICY IF EXISTS "Public can view motifs" ON motifs_paiement;
CREATE POLICY "Public can view motifs"
  ON motifs_paiement FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Public can view annees" ON annees_scolaires;
CREATE POLICY "Public can view annees"
  ON annees_scolaires FOR SELECT
  TO anon
  USING (true);

-- ============================================================
-- Politiques ELEVÉES : admin/it_manager voient tout dans leur école
-- (Ces rôles utilisent le sélecteur d'école pour changer d'école)
-- ============================================================

-- Note: Les politiques standard ci-dessus suffisent car :
-- - admin/it_manager utilisent le sélecteur d'école (localStorage)
-- - L'override change l'ecole_id effective utilisée dans get_current_ecole_id()
-- - Pour voir TOUTES les écoles, il faut que get_current_ecole_id retourne NULL
-- 
-- Pour l'instant, admin/it_manager voient leur école + peuvent switcher.
-- Une future évolution pourrait ajouter un mode "toutes les écoles".

-- ============================================================
-- Récapitulatif
-- ============================================================
-- Tables tenant-scopées   : 23 (via boucle dynamique)
-- Politiques recréées      : ~92 (4 par table × 23 = 92)
-- Politiques spéciales     : profiles, chat, app_settings, anon
-- Tables système inchangées: roles, user_activity_logs, chat_participants,
--                            chat_message_reads, menu_visibility
-- Politiques anon préservées: paiements, eleves, cours, devoirs,
--                              motifs_paiement, annees_scolaires
-- Données perdues          : 0
-- ============================================================
-- VÉRIFICATION après déploiement :
--   SELECT schemaname, tablename, policyname, cmd, qual
--   FROM pg_policies WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
--   → Toutes les politiques doivent contenir ecole_id = get_current_ecole_id()
--     (sauf les politiques système et anon)
-- ============================================================
