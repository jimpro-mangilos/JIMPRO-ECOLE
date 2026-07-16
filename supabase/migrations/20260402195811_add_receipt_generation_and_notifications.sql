/*
  # Amélioration Système de Paiements

  1. Nouvelles Fonctionnalités
    - Fonction de génération automatique de numéros de reçu
    - Séquence pour numérotation unique des reçus
    - Table pour tracker les notifications envoyées
    - Fonction pour obtenir les statistiques par comptable
    - Fonction pour obtenir les statistiques par période

  2. Tables
    - `notifications_log` pour tracer l'envoi de SMS/Email
    
  3. Fonctions
    - `generate_numero_recu()` pour créer numéros de reçu uniques
    - `get_comptable_stats()` pour statistiques par comptable
    - `get_period_stats()` pour statistiques par période

  4. Sécurité
    - Enable RLS sur notifications_log
    - Politiques restrictives pour accès aux données
*/

-- Créer une séquence pour les numéros de reçu
CREATE SEQUENCE IF NOT EXISTS numero_recu_seq START 1000;

-- Fonction pour générer un numéro de reçu unique
CREATE OR REPLACE FUNCTION generate_numero_recu()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_num integer;
  current_year text;
  receipt_num text;
BEGIN
  -- Obtenir le prochain numéro de la séquence
  next_num := nextval('numero_recu_seq');
  
  -- Obtenir l'année courante
  current_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Format: RECU-YYYY-NNNN (ex: RECU-2026-1000)
  receipt_num := 'RECU-' || current_year || '-' || LPAD(next_num::text, 4, '0');
  
  RETURN receipt_num;
END;
$$;

-- Table pour logger les notifications envoyées
CREATE TABLE IF NOT EXISTS notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paiement_id uuid NOT NULL REFERENCES paiements(id) ON DELETE CASCADE,
  type_notification text NOT NULL CHECK (type_notification IN ('sms', 'email')),
  destinataire text NOT NULL,
  message text NOT NULL,
  statut text NOT NULL DEFAULT 'pending' CHECK (statut IN ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS sur notifications_log
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Politique pour que seuls les utilisateurs authentifiés avec les bons rôles puissent voir les notifications
CREATE POLICY "Authorized users can view notifications"
  ON notifications_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'IT_MANAGER', 'comptable')
    )
  );

-- Politique pour que seuls les utilisateurs autorisés puissent créer des notifications
CREATE POLICY "Authorized users can create notifications"
  ON notifications_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'IT_MANAGER', 'comptable')
    )
  );

-- Fonction pour obtenir les statistiques d'un comptable
CREATE OR REPLACE FUNCTION get_comptable_stats(
  p_comptable_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_paiements bigint,
  montant_total numeric,
  paiements_encaisses bigint,
  montant_encaisse numeric,
  paiements_en_attente bigint,
  montant_en_attente numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_paiements,
    COALESCE(SUM(montant_paye), 0) AS montant_total,
    COUNT(*) FILTER (WHERE est_encaisse = true)::bigint AS paiements_encaisses,
    COALESCE(SUM(montant_paye) FILTER (WHERE est_encaisse = true), 0) AS montant_encaisse,
    COUNT(*) FILTER (WHERE est_encaisse = false)::bigint AS paiements_en_attente,
    COALESCE(SUM(montant_paye) FILTER (WHERE est_encaisse = false), 0) AS montant_en_attente
  FROM paiements
  WHERE comptable_id = p_comptable_id
    AND (p_start_date IS NULL OR date_paiement >= p_start_date)
    AND (p_end_date IS NULL OR date_paiement <= p_end_date);
END;
$$;

-- Fonction pour obtenir les statistiques par période
CREATE OR REPLACE FUNCTION get_period_stats(
  p_comptable_id uuid,
  p_period text DEFAULT 'day'
)
RETURNS TABLE (
  period_date date,
  nombre_paiements bigint,
  montant_encaisse numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_paiement AS period_date,
    COUNT(*)::bigint AS nombre_paiements,
    COALESCE(SUM(montant_paye), 0) AS montant_encaisse
  FROM paiements
  WHERE comptable_id = p_comptable_id
    AND est_encaisse = true
    AND date_paiement >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY date_paiement
  ORDER BY date_paiement DESC;
END;
$$;

-- Trigger pour générer automatiquement le numéro de reçu
CREATE OR REPLACE FUNCTION set_numero_recu()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero_recu IS NULL THEN
    NEW.numero_recu := generate_numero_recu();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_set_numero_recu'
  ) THEN
    CREATE TRIGGER trigger_set_numero_recu
      BEFORE INSERT ON paiements
      FOR EACH ROW
      EXECUTE FUNCTION set_numero_recu();
  END IF;
END $$;

-- Ajouter un index sur les colonnes fréquemment utilisées
CREATE INDEX IF NOT EXISTS idx_paiements_comptable_id ON paiements(comptable_id);
CREATE INDEX IF NOT EXISTS idx_paiements_date_paiement ON paiements(date_paiement);
CREATE INDEX IF NOT EXISTS idx_paiements_est_encaisse ON paiements(est_encaisse);
CREATE INDEX IF NOT EXISTS idx_paiements_eleve_id ON paiements(eleve_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_paiement_id ON notifications_log(paiement_id);
