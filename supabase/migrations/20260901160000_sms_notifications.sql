-- ============================================================
-- Notifications SMS — journal des envois
--  · table notifications_sms : journal de chaque SMS (paiements,
--    permissions...) avec statut (en_attente | envoye | echec)
--  · la configuration du prestataire (Twilio / Africa's Talking)
--    est stockée dans app_settings (clés sms_*) — aucun secret
--    n'est stocké côté client en dur
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications_sms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  eleve_id uuid,
  telephone text NOT NULL,
  message text NOT NULL,
  contexte text,               -- ex : 'paiement', 'permission', 'test'
  statut text NOT NULL DEFAULT 'en_attente',  -- en_attente | envoye | echec
  erreur text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_sms_ecole ON public.notifications_sms (ecole_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sms_statut ON public.notifications_sms (statut);

ALTER TABLE public.notifications_sms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_sms_select" ON public.notifications_sms;
CREATE POLICY "notifications_sms_select" ON public.notifications_sms FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "notifications_sms_insert" ON public.notifications_sms;
CREATE POLICY "notifications_sms_insert" ON public.notifications_sms FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "notifications_sms_update" ON public.notifications_sms;
CREATE POLICY "notifications_sms_update" ON public.notifications_sms FOR UPDATE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL)
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);
