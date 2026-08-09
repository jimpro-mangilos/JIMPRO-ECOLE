-- ============================================================
-- Ajoute ecole_id à user_activity_logs + RLS tenant-scoping
-- ============================================================
-- Problème : user_activity_logs était exclu du scoping multi-école
-- (20260809140000, ligne 36) car classé "table système".
-- En pratique, un admin de l'école A pouvait voir les logs
-- d'activité de l'école B car la politique SELECT n'était pas
-- scopée par ecole_id.
-- ============================================================

-- 1. Ajouter la colonne ecole_id
ALTER TABLE user_activity_logs
  ADD COLUMN IF NOT EXISTS ecole_id uuid;

-- 2. Backfill : remplir ecole_id depuis le profil de l'utilisateur
UPDATE user_activity_logs ual
  SET ecole_id = p.ecole_id
FROM profiles p
WHERE ual.user_id = p.id
  AND ual.ecole_id IS NULL;

-- 3. Rendre NOT NULL après backfill
ALTER TABLE user_activity_logs
  ALTER COLUMN ecole_id SET NOT NULL;

-- 4. Ajouter la contrainte FK
ALTER TABLE user_activity_logs
  ADD CONSTRAINT fk_user_activity_logs_ecole
  FOREIGN KEY (ecole_id) REFERENCES ecoles(id);

-- 5. Index pour les requêtes scopées par école
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_ecole_id
  ON user_activity_logs(ecole_id);

-- 6. Remplacer la politique SELECT par une version scopée
DROP POLICY IF EXISTS "Seuls les admins peuvent voir les logs"
  ON public.user_activity_logs;

CREATE POLICY "Admins voient les logs de leur ecole"
  ON public.user_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    ecole_id = get_current_ecole_id()
    AND EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

-- 7. Mettre à jour la politique INSERT pour inclure ecole_id
DROP POLICY IF EXISTS "Utilisateur peut creer ses propres logs"
  ON public.user_activity_logs;

CREATE POLICY "Utilisateur cree ses logs dans son ecole"
  ON public.user_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND ecole_id = get_current_ecole_id()
  );
