/*
  # Ajout des motifs de paiement et de l'année

  1. Nouvelle Table
    - `motifs_paiement` pour gérer les motifs configurables
      - `id` (uuid, primary key)
      - `libelle` (text, unique) - Le nom du motif
      - `description` (text, nullable) - Description du motif
      - `is_active` (boolean) - Si le motif est valide/actif
      - `ordre` (integer) - Pour trier les motifs
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modifications de la table paiements
    - Ajout de la colonne `annee_scolaire` (text) - Ex: "2025-2026"
    - Ajout de la colonne `motif_id` (uuid) - Référence vers motifs_paiement

  3. Sécurité
    - Enable RLS sur `motifs_paiement`
    - Politiques pour lecture par tous les utilisateurs authentifiés
    - Politiques pour modification par admin uniquement

  4. Données initiales
    - Insertion de motifs par défaut
*/

-- Créer la table motifs_paiement
CREATE TABLE IF NOT EXISTS motifs_paiement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS sur motifs_paiement
ALTER TABLE motifs_paiement ENABLE ROW LEVEL SECURITY;

-- Politique pour que tous les utilisateurs authentifiés puissent lire les motifs actifs
CREATE POLICY "Authenticated users can view active motifs"
  ON motifs_paiement FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Politique pour que les admins puissent voir tous les motifs
CREATE POLICY "Admins can view all motifs"
  ON motifs_paiement FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = 'admin'
    )
  );

-- Politique pour que les admins puissent créer des motifs
CREATE POLICY "Admins can create motifs"
  ON motifs_paiement FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = 'admin'
    )
  );

-- Politique pour que les admins puissent modifier des motifs
CREATE POLICY "Admins can update motifs"
  ON motifs_paiement FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = 'admin'
    )
  );

-- Politique pour que les admins puissent supprimer des motifs
CREATE POLICY "Admins can delete motifs"
  ON motifs_paiement FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom = 'admin'
    )
  );

-- Ajouter les colonnes à la table paiements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'annee_scolaire'
  ) THEN
    ALTER TABLE paiements ADD COLUMN annee_scolaire text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'motif_id'
  ) THEN
    ALTER TABLE paiements ADD COLUMN motif_id uuid REFERENCES motifs_paiement(id);
  END IF;
END $$;

-- Insérer des motifs par défaut
INSERT INTO motifs_paiement (libelle, description, ordre, is_active) VALUES
  ('1ère Tranche', 'Première tranche du minerval', 1, true),
  ('2ème Tranche', 'Deuxième tranche du minerval', 2, true),
  ('3ème Tranche', 'Troisième tranche du minerval', 3, true),
  ('Paiement Complet', 'Paiement complet du minerval en une fois', 4, true),
  ('Régularisation', 'Paiement de régularisation', 5, true),
  ('Rattrapage', 'Paiement pour cours de rattrapage', 6, true)
ON CONFLICT (libelle) DO NOTHING;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_paiements_motif_id ON paiements(motif_id);
CREATE INDEX IF NOT EXISTS idx_paiements_annee_scolaire ON paiements(annee_scolaire);
CREATE INDEX IF NOT EXISTS idx_motifs_paiement_is_active ON motifs_paiement(is_active);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_motif_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger pour mettre à jour updated_at automatiquement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_motif_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_motif_updated_at
      BEFORE UPDATE ON motifs_paiement
      FOR EACH ROW
      EXECUTE FUNCTION update_motif_updated_at();
  END IF;
END $$;
