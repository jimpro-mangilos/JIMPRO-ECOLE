-- Allow public (anon) read access to cours and devoirs for the parent/student portal
DROP POLICY IF EXISTS "Public can view cours" ON cours;
CREATE POLICY "Public can view cours" ON cours
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can view devoirs" ON devoirs;
CREATE POLICY "Public can view devoirs" ON devoirs
  FOR SELECT TO anon USING (true);
