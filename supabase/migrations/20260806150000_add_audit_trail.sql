/*
  # Add Audit Trail

  Creates audit_logs table and triggers on critical tables to track
  who did what and when. Compliant with financial accountability requirements.

  Tables tracked: compte_courant, paiements, eleves
*/

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and it_manager can view audit logs
CREATE POLICY "Admins and IT managers can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'it_manager')
    )
  );

-- Trigger function
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), user_id);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), user_id);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), user_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_compte_courant') THEN
    CREATE TRIGGER audit_compte_courant AFTER INSERT OR UPDATE OR DELETE ON compte_courant FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_paiements') THEN
    CREATE TRIGGER audit_paiements AFTER INSERT OR UPDATE OR DELETE ON paiements FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_eleves') THEN
    CREATE TRIGGER audit_eleves AFTER INSERT OR UPDATE OR DELETE ON eleves FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
  END IF;
END
$$;
