/*
# Add Promoteur Role

## Summary
Adds a new "promoteur" role with elevated permissions.

## Changes
1. New role inserted into `roles` table:
   - `nom`: 'promoteur'
   - `permissions`: {"all": true, "can_approve": true, "can_encaisser": true, "can_view_dashboard": true, "can_export": true}
   - `description`: Promoteur - Full access with unlimited transaction approval and encaissement

## Notes
- The Promoteur can approve ALL transactions regardless of amount (no cap)
- The Promoteur can encaisser/decaisser transactions including those with montant 0
- The Promoteur has full visibility on all pages
- The Promoteur is NOT read-only (unlike coordonnateur)
*/

INSERT INTO roles (nom, permissions, description)
SELECT 'promoteur', '{"all": true, "can_approve": true, "can_encaisser": true, "can_view_dashboard": true, "can_export": true}'::jsonb, 'Promoteur - Accès complet avec approbation et encaissement illimités'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE nom = 'promoteur'
);