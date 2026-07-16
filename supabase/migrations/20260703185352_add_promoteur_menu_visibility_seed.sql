/*
# Seed menu_visibility for the Promoteur role

## Summary
Inserts default menu_visibility rows for the "promoteur" role so that the
menu configuration system can manage its visible pages, just like all
other roles.

## Changes
1. Inserts 12 menu items for the promoteur role with default visibility:
   - All menus visible by default (promoteur has full access)
   - Uses ON CONFLICT DO NOTHING to be idempotent

## Notes
- The promoteur can now be configured via the Menu Config tab in Configuration
- Admins/IT Managers can hide specific menus from the promoteur if needed
- By default the promoteur sees everything (similar to admin)
*/

DO $$
DECLARE
  r_promoteur uuid;
BEGIN
  SELECT id INTO r_promoteur FROM roles WHERE nom = 'promoteur';

  IF r_promoteur IS NOT NULL THEN
    INSERT INTO menu_visibility (role_id, menu_key, label, is_visible, ordre) VALUES
      (r_promoteur, 'dashboard', 'Tableau de Bord', true, 1),
      (r_promoteur, 'eleves', 'Eleves', true, 2),
      (r_promoteur, 'paiements', 'Paiements', true, 3),
      (r_promoteur, 'finances', 'Finances', true, 4),
      (r_promoteur, 'fournitures-eleves', 'Fournitures Eleves', true, 5),
      (r_promoteur, 'fournitures-bureau', 'Fournitures Bureau', true, 6),
      (r_promoteur, 'stock-uniformes', 'Stock Uniformes', true, 7),
      (r_promoteur, 'rapports', 'Rapports', true, 8),
      (r_promoteur, 'tableau-bord-comptable', 'TB Comptable', true, 9),
      (r_promoteur, 'configuration', 'Configuration', true, 10),
      (r_promoteur, 'admin', 'Administration', false, 11),
      (r_promoteur, 'chat', 'Messages', true, 12)
    ON CONFLICT (role_id, menu_key) DO NOTHING;
  END IF;
END $$;