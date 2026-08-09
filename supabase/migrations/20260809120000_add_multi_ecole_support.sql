-- ============================================================
-- Phase 1: Multi-École — Table `ecoles` + FK sur toutes les tables domaine
-- ============================================================
-- Stratégie 100% additive :
--   - Aucun DROP, aucun DELETE, aucun TRUNCATE
--   - Colonnes d'abord NULL-able, backfill, puis NOT NULL
--   - École par défaut : C.S_GOLDEN_ACADEMY (données existantes)
-- ============================================================

-- 1. Création de la table `ecoles`
-- ============================================================
CREATE TABLE IF NOT EXISTS ecoles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  code text UNIQUE NOT NULL,          -- ex: "CSGA"
  adresse text,
  telephone text,
  email text,
  logo_url text,
  annee_scolaire_active text,        -- ex: "2025-2026"
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Active RLS sur ecoles
ALTER TABLE ecoles ENABLE ROW LEVEL SECURITY;

-- Pour l'instant : tous les authenticated voient toutes les écoles
-- (sera restreint Phase 4 avec tenant-scoping)
CREATE POLICY "Authenticated can view ecoles"
  ON ecoles FOR SELECT
  TO authenticated
  USING (true);

-- Seul admin/it_manager peut créer/modifier une école
CREATE POLICY "Admin can manage ecoles"
  ON ecoles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = ANY(ARRAY['admin', 'it_manager'])
    )
  );

-- 2. Insérer l'école par défaut : C.S_GOLDEN_ACADEMY
-- ============================================================
INSERT INTO ecoles (nom, code)
VALUES ('C.S_GOLDEN_ACADEMY', 'CSGA')
ON CONFLICT (code) DO NOTHING;

-- Récupérer l'UUID pour le backfill (via une variable)
DO $$
DECLARE
  default_ecole_id uuid;
BEGIN
  SELECT id INTO default_ecole_id FROM ecoles WHERE code = 'CSGA';

  -- ============================================================
  -- 3. Ajout colonne ecole_id sur TOUTES les tables domaine
  --    (NULL-able d'abord — aucune contrainte immédiate)
  -- ============================================================

  -- 3a. Élèves et données scolaires
  ALTER TABLE eleves                  ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE classes                 ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE sections                ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE options                 ADD COLUMN IF NOT EXISTS ecole_id uuid;

  -- 3b. Comptabilité et finances
  ALTER TABLE compte_courant          ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE paiements               ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE notifications_log       ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE motifs_paiement         ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE types_paiement          ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE annees_scolaires        ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE section_prefixes        ADD COLUMN IF NOT EXISTS ecole_id uuid;

  -- 3c. Fournitures
  ALTER TABLE gestion_fournitures     ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE gestion_fourniture_bureau ADD COLUMN IF NOT EXISTS ecole_id uuid;

  -- 3d. Uniformes
  ALTER TABLE types_uniforme          ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE gestion_uniformes       ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE stock_uniformes         ADD COLUMN IF NOT EXISTS ecole_id uuid;

  -- 3e. Chat
  ALTER TABLE chat_conversations      ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE chat_messages           ADD COLUMN IF NOT EXISTS ecole_id uuid;

  -- 3f. Cours & Devoirs
  ALTER TABLE cours                   ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE devoirs                 ADD COLUMN IF NOT EXISTS ecole_id uuid;

  -- 3g. Audit & Configuration
  ALTER TABLE audit_logs              ADD COLUMN IF NOT EXISTS ecole_id uuid;
  ALTER TABLE app_settings            ADD COLUMN IF NOT EXISTS ecole_id uuid;

  -- 3h. Profils (lie l'utilisateur à son école)
  ALTER TABLE profiles                ADD COLUMN IF NOT EXISTS ecole_id uuid;

  -- ============================================================
  -- 4. BACKFILL : remplir ecole_id avec l'école par défaut
  --    sur toutes les lignes existantes
  -- ============================================================

  UPDATE eleves                  SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE classes                 SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE sections                SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE options                 SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE compte_courant          SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE paiements               SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE notifications_log       SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE motifs_paiement         SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE types_paiement          SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE annees_scolaires        SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE section_prefixes        SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE gestion_fournitures     SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE gestion_fourniture_bureau SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE types_uniforme          SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE gestion_uniformes       SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE stock_uniformes         SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE chat_conversations      SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE chat_messages           SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE cours                   SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE devoirs                 SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE audit_logs              SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE app_settings            SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;
  UPDATE profiles                SET ecole_id = default_ecole_id WHERE ecole_id IS NULL;

  -- ============================================================
  -- 5. Contraintes NOT NULL (une fois le backfill terminé)
  -- ============================================================

  ALTER TABLE eleves                  ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE classes                 ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE sections                ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE options                 ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE compte_courant          ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE paiements               ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE notifications_log       ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE motifs_paiement         ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE types_paiement          ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE annees_scolaires        ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE section_prefixes        ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE gestion_fournitures     ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE gestion_fourniture_bureau ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE types_uniforme          ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE gestion_uniformes       ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE stock_uniformes         ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE chat_conversations      ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE chat_messages           ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE cours                   ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE devoirs                 ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE audit_logs              ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE app_settings            ALTER COLUMN ecole_id SET NOT NULL;
  ALTER TABLE profiles                ALTER COLUMN ecole_id SET NOT NULL;

  -- ============================================================
  -- 6. Clés étrangères (FK)
  -- ============================================================

  ALTER TABLE eleves                  ADD CONSTRAINT fk_eleves_ecole                  FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE classes                 ADD CONSTRAINT fk_classes_ecole                 FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE sections                ADD CONSTRAINT fk_sections_ecole                FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE options                 ADD CONSTRAINT fk_options_ecole                 FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE compte_courant          ADD CONSTRAINT fk_compte_courant_ecole          FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE paiements               ADD CONSTRAINT fk_paiements_ecole               FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE notifications_log       ADD CONSTRAINT fk_notifications_log_ecole       FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE motifs_paiement         ADD CONSTRAINT fk_motifs_paiement_ecole         FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE types_paiement          ADD CONSTRAINT fk_types_paiement_ecole          FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE annees_scolaires        ADD CONSTRAINT fk_annees_scolaires_ecole        FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE section_prefixes        ADD CONSTRAINT fk_section_prefixes_ecole        FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE gestion_fournitures     ADD CONSTRAINT fk_gestion_fournitures_ecole     FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE gestion_fourniture_bureau ADD CONSTRAINT fk_gestion_fourniture_bureau_ecole FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE types_uniforme          ADD CONSTRAINT fk_types_uniforme_ecole          FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE gestion_uniformes       ADD CONSTRAINT fk_gestion_uniformes_ecole       FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE stock_uniformes         ADD CONSTRAINT fk_stock_uniformes_ecole         FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE chat_conversations      ADD CONSTRAINT fk_chat_conversations_ecole      FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE chat_messages           ADD CONSTRAINT fk_chat_messages_ecole           FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE cours                   ADD CONSTRAINT fk_cours_ecole                   FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE devoirs                 ADD CONSTRAINT fk_devoirs_ecole                 FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE audit_logs              ADD CONSTRAINT fk_audit_logs_ecole              FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE app_settings            ADD CONSTRAINT fk_app_settings_ecole            FOREIGN KEY (ecole_id) REFERENCES ecoles(id);
  ALTER TABLE profiles                ADD CONSTRAINT fk_profiles_ecole                FOREIGN KEY (ecole_id) REFERENCES ecoles(id);

  -- ============================================================
  -- 7. Index pour les requêtes filtrées par école
  -- ============================================================

  CREATE INDEX IF NOT EXISTS idx_eleves_ecole                  ON eleves(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_classes_ecole                 ON classes(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_sections_ecole                ON sections(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_options_ecole                 ON options(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_compte_courant_ecole          ON compte_courant(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_paiements_ecole               ON paiements(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_log_ecole       ON notifications_log(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_motifs_paiement_ecole         ON motifs_paiement(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_types_paiement_ecole          ON types_paiement(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_annees_scolaires_ecole        ON annees_scolaires(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_section_prefixes_ecole        ON section_prefixes(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_gestion_fournitures_ecole     ON gestion_fournitures(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_gestion_fourniture_bureau_ecole ON gestion_fourniture_bureau(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_types_uniforme_ecole          ON types_uniforme(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_gestion_uniformes_ecole       ON gestion_uniformes(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_stock_uniformes_ecole         ON stock_uniformes(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_chat_conversations_ecole      ON chat_conversations(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_ecole           ON chat_messages(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_cours_ecole                   ON cours(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_devoirs_ecole                 ON devoirs(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_ecole              ON audit_logs(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_app_settings_ecole            ON app_settings(ecole_id);
  CREATE INDEX IF NOT EXISTS idx_profiles_ecole                ON profiles(ecole_id);

  -- ============================================================
  -- 8. Ajustement UNIQUE sur app_settings (passe de (key) à (ecole_id, key))
  -- ============================================================

  -- Supprimer l'ancienne contrainte unique globale
  ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_key_key;

  -- Créer la nouvelle contrainte composite
  ALTER TABLE app_settings ADD CONSTRAINT app_settings_ecole_key_unique
    UNIQUE (ecole_id, key);

END $$;

-- ============================================================
-- Récapitulatif
-- ============================================================
-- Tables modifiées : 23 (toutes avec ecole_id NOT NULL + FK + index)
-- École créée      : 1  (C.S_GOLDEN_ACADEMY)
-- Données perdues  : 0  (zéro DELETE, zéro DROP de données)
-- RLS modifiée     : 0  (viendra en Phase 4)
-- ============================================================
