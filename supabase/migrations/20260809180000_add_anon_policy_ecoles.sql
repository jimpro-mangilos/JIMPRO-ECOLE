-- ============================================================
-- Ajoute une politique anon SELECT sur ecoles
-- ============================================================
-- Problème : les portails publics (Parent, Recouvrement)
-- utilisent usePublicSchool qui requête la table ecoles
-- pour résoudre ?ecole=CODE → UUID.
-- Sans politique anon, la requête échoue → schoolId = null
-- → "Aucune école sélectionnée".
-- ============================================================

-- Permettre aux utilisateurs anonymes de lister les écoles actives
CREATE POLICY "Public can view active schools"
  ON ecoles
  FOR SELECT
  TO anon
  USING (is_active = true);
