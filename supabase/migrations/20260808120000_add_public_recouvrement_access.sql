-- Add public (anon) read access for portail recouvrement
CREATE POLICY "Public can view active motifs" ON motifs_paiement FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public can view active annees" ON annees_scolaires FOR SELECT TO anon USING (is_active = true);
