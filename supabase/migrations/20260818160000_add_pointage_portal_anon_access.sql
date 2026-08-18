-- ============================================================
-- Portail public de pointage du personnel (scan QR)
-- Accès anon : lecture du personnel + écriture des pointages
-- ============================================================

DROP POLICY IF EXISTS "public_personnel_select" ON public.personnel;
CREATE POLICY "public_personnel_select" ON public.personnel
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public_pointages_select" ON public.pointages_personnel;
CREATE POLICY "public_pointages_select" ON public.pointages_personnel
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public_pointages_insert" ON public.pointages_personnel;
CREATE POLICY "public_pointages_insert" ON public.pointages_personnel
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "public_pointages_update" ON public.pointages_personnel;
CREATE POLICY "public_pointages_update" ON public.pointages_personnel
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
