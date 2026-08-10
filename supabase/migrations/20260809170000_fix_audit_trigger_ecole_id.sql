-- ============================================================
-- Fix: ajoute ecole_id dans le trigger audit_trigger_fn
-- ============================================================
-- Problème : la migration multi-école (20260809120000) a ajouté
-- ecole_id NOT NULL sur audit_logs, mais le trigger d'audit
-- (20260806150000) n'a jamais été mis à jour pour inclure
-- ecole_id dans ses INSERT.
-- → Toute opération INSERT/UPDATE/DELETE sur eleves, paiements
--   ou compte_courant déclenchait :
--   "null value in column ecole_id violates not-null constraint"
-- ============================================================

-- Recréer la fonction trigger avec ecole_id
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger AS $$
DECLARE
  user_id uuid;
  rec_ecole_id uuid;
BEGIN
  user_id := auth.uid();

  -- Récupérer ecole_id depuis le nouvel enregistrement (INSERT/UPDATE)
  -- ou l'ancien (DELETE)
  IF TG_OP = 'DELETE' THEN
    rec_ecole_id := OLD.ecole_id;
  ELSE
    rec_ecole_id := NEW.ecole_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by, ecole_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), user_id, rec_ecole_id);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by, ecole_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), user_id, rec_ecole_id);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by, ecole_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), user_id, rec_ecole_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
