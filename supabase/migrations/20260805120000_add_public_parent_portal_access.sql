/*
# Add public read access for parent portal

## Summary
Adds a public SELECT policy on the paiements table so the Portail Parent
can fetch payment history without authentication.

## Tables affected
- paiements: new SELECT policy for anonymous users
*/

-- Allow anonymous (public) reads on paiements for the parent portal
DROP POLICY IF EXISTS "Public can view paiements for parent portal" ON paiements;
CREATE POLICY "Public can view paiements for parent portal"
  ON paiements FOR SELECT
  TO anon
  USING (true);

-- Also ensure eleves has public read access (it already has USING(true) but double-check)
DROP POLICY IF EXISTS "Public can view eleves for parent portal" ON eleves;
CREATE POLICY "Public can view eleves for parent portal"
  ON eleves FOR SELECT
  TO anon
  USING (true);
