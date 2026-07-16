/*
  Système de Gestion des Paiements

  1. Nouvelles Tables
    - paiements: Enregistre tous les paiements effectués par les élèves
      
  2. Fonctions
    - generate_numero_recu: Génère le numéro de reçu unique globalement
    
  3. Sécurité
    - Enable RLS sur la table paiements
    - Policies pour les admins et comptables
*/

-- Table des paiements
CREATE TABLE IF NOT EXISTS paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_recu text UNIQUE,
  eleve_id uuid REFERENCES eleves(id) ON DELETE RESTRICT NOT NULL,
  nom_eleve text NOT NULL,
  classe text NOT NULL,
  type_paiement text NOT NULL CHECK (type_paiement IN ('minerval', 'fournitures_eleves', 'fournitures_bureau', 'autre')),
  description text,
  montant_paye numeric(10,2) NOT NULL CHECK (montant_paye > 0),
  montant_en_lettre text NOT NULL,
  mode_paiement text NOT NULL CHECK (mode_paiement IN ('especes', 'mobile_money', 'virement', 'cheque')),
  date_paiement date NOT NULL DEFAULT CURRENT_DATE,
  comptable_id uuid REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
  nom_comptable text NOT NULL,
  est_encaisse boolean DEFAULT false,
  date_encaissement timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_paiements_eleve ON paiements(eleve_id);
CREATE INDEX IF NOT EXISTS idx_paiements_comptable ON paiements(comptable_id);
CREATE INDEX IF NOT EXISTS idx_paiements_date ON paiements(date_paiement);
CREATE INDEX IF NOT EXISTS idx_paiements_type ON paiements(type_paiement);
CREATE INDEX IF NOT EXISTS idx_paiements_encaisse ON paiements(est_encaisse);
CREATE INDEX IF NOT EXISTS idx_paiements_numero_recu ON paiements(numero_recu);

-- Fonction pour générer le numéro de reçu unique
CREATE OR REPLACE FUNCTION generate_numero_recu()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  date_part text;
  sequence_num integer;
  new_numero text;
BEGIN
  date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(numero_recu FROM '\d+$') AS integer
      )
    ), 0
  ) INTO sequence_num
  FROM paiements
  WHERE numero_recu IS NOT NULL;
  
  sequence_num := sequence_num + 1;
  
  new_numero := 'REC-' || date_part || '-' || LPAD(sequence_num::text, 7, '0');
  
  RETURN new_numero;
END;
$$;

-- Trigger pour auto-générer le numéro de reçu
CREATE OR REPLACE FUNCTION set_numero_recu()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero_recu IS NULL THEN
    NEW.numero_recu := generate_numero_recu();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_numero_recu ON paiements;
CREATE TRIGGER trigger_set_numero_recu
  BEFORE INSERT ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION set_numero_recu();

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_paiements_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_paiements_timestamp ON paiements;
CREATE TRIGGER trigger_update_paiements_timestamp
  BEFORE UPDATE ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION update_paiements_updated_at();

-- Enable RLS
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

-- Policy: Les admins peuvent tout faire
CREATE POLICY "Admins can do everything on paiements"
  ON paiements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

-- Policy: Les comptables peuvent voir tous les paiements
CREATE POLICY "Comptables can view all paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'comptable')
    )
  );

-- Policy: Les comptables peuvent créer des paiements
CREATE POLICY "Comptables can create paiements"
  ON paiements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom IN ('admin', 'comptable')
    )
  );

-- Policy: Les comptables peuvent modifier leurs propres paiements
CREATE POLICY "Comptables can update their own paiements"
  ON paiements FOR UPDATE
  TO authenticated
  USING (
    comptable_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  )
  WITH CHECK (
    comptable_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );

-- Policy: Seuls les admins peuvent supprimer
CREATE POLICY "Only admins can delete paiements"
  ON paiements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid() AND r.nom = 'admin'
    )
  );