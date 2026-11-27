-- ============================================================
-- Ajout du menu « Journal d'audit » (admin + it_manager)
-- ============================================================
-- Rend visible la table audit_logs (traçabilité des INSERT /
-- UPDATE / DELETE sur paiements, compte_courant, eleves) via
-- une nouvelle page /journal-audit.
-- Seuls admin et it_manager peuvent lire audit_logs (RLS).
-- ============================================================

DO $$
DECLARE
  r uuid;
BEGIN
  SELECT id INTO r FROM roles WHERE nom = 'admin';
  IF r IS NOT NULL THEN
    INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre)
    VALUES (r, 'journal-audit', 'Journal d''audit', true, 13)
    ON CONFLICT (role_id, menu_key) DO NOTHING;
  END IF;

  SELECT id INTO r FROM roles WHERE nom = 'it_manager';
  IF r IS NOT NULL THEN
    INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre)
    VALUES (r, 'journal-audit', 'Journal d''audit', true, 13)
    ON CONFLICT (role_id, menu_key) DO NOTHING;
  END IF;
END $$;
