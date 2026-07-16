/*
  # Gestion du stock des uniformes

  ## Résumé
  Ce migration ajoute un système complet de gestion des stocks d'uniformes scolaires,
  avec un contrôle automatique côté base de données qui empêche toute distribution
  si le stock est insuffisant.

  ## Nouvelles tables

  ### `stock_uniformes`
  Enregistre les quantités disponibles par type d'article et par année scolaire.
  - `id` (uuid, primary key)
  - `type_uniforme_id` (uuid, FK vers types_uniforme) — article concerné
  - `type_uniforme_libelle` (text) — libellé dénormalisé pour l'historique
  - `annee_scolaire` (text) — ex: "2025-2026"
  - `quantite_stock` (integer, NOT NULL, >= 0) — quantité disponible
  - `seuil_alerte` (integer, nullable) — seuil en dessous duquel on affiche une alerte
  - `notes` (text, nullable)
  - `comptable_id` (uuid, FK vers auth.users)
  - `nom_comptable` (text)
  - `created_at`, `updated_at` (timestamps)
  - Contrainte unique sur (type_uniforme_id, annee_scolaire)

  ## Trigger

  ### `trg_check_and_decrement_stock`
  Se déclenche BEFORE INSERT sur `gestion_uniformes`.
  - Vérifie l'existence d'un enregistrement de stock pour (type_uniforme_id, annee_scolaire)
  - Lève une exception si le stock n'est pas configuré
  - Lève une exception si quantite_stock < quantite demandée
  - Déduit la quantite du stock si tout est OK

  ## Sécurité
  - RLS activé sur stock_uniformes
  - Lecture: tous les authentifiés
  - INSERT/UPDATE: admin, it_manager, secretaire
  - DELETE: admin, it_manager uniquement
*/

-- =============================================
-- TABLE: stock_uniformes
-- =============================================
CREATE TABLE IF NOT EXISTS stock_uniformes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_uniforme_id uuid NOT NULL REFERENCES types_uniforme(id) ON DELETE CASCADE,
  type_uniforme_libelle text NOT NULL,
  annee_scolaire text NOT NULL,
  quantite_stock integer NOT NULL DEFAULT 0 CHECK (quantite_stock >= 0),
  seuil_alerte integer,
  notes text,
  comptable_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nom_comptable text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_stock_par_article_annee UNIQUE (type_uniforme_id, annee_scolaire)
);

ALTER TABLE stock_uniformes ENABLE ROW LEVEL SECURITY;

-- Lecture: tous les authentifiés
CREATE POLICY "Authenticated users can view stock_uniformes"
  ON stock_uniformes FOR SELECT
  TO authenticated
  USING (true);

-- Insertion: admin, it_manager, secretaire
CREATE POLICY "Staff can insert stock_uniformes"
  ON stock_uniformes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager', 'secretaire')
    )
  );

-- Mise à jour: admin, it_manager, secretaire
CREATE POLICY "Staff can update stock_uniformes"
  ON stock_uniformes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager', 'secretaire')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager', 'secretaire')
    )
  );

-- Suppression: admin et it_manager uniquement
CREATE POLICY "Admins and IT managers can delete stock_uniformes"
  ON stock_uniformes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.role_id = r.id
      WHERE p.id = auth.uid()
      AND r.nom IN ('admin', 'it_manager')
    )
  );

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_stock_uniformes_type_annee
  ON stock_uniformes(type_uniforme_id, annee_scolaire);

-- =============================================
-- TRIGGER: contrôle et déduction du stock
-- =============================================

CREATE OR REPLACE FUNCTION check_and_decrement_uniforme_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_stock_record stock_uniformes%ROWTYPE;
BEGIN
  -- Vérifier si un enregistrement de stock existe pour cet article + cette année
  SELECT * INTO v_stock_record
  FROM stock_uniformes
  WHERE type_uniforme_id = NEW.type_uniforme_id
    AND annee_scolaire = NEW.annee_scolaire
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock non configuré pour cet article (%) et cette année scolaire (%). Veuillez d''abord approvisionner le stock.',
      NEW.type_uniforme_libelle, NEW.annee_scolaire;
  END IF;

  IF v_stock_record.quantite_stock < NEW.quantite THEN
    RAISE EXCEPTION 'Stock insuffisant pour % : % article(s) disponible(s), % demandé(s).',
      NEW.type_uniforme_libelle,
      v_stock_record.quantite_stock,
      NEW.quantite;
  END IF;

  -- Déduire la quantité distribuée du stock
  UPDATE stock_uniformes
  SET
    quantite_stock = quantite_stock - NEW.quantite,
    updated_at = now()
  WHERE id = v_stock_record.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_and_decrement_stock ON gestion_uniformes;

CREATE TRIGGER trg_check_and_decrement_stock
  BEFORE INSERT ON gestion_uniformes
  FOR EACH ROW
  EXECUTE FUNCTION check_and_decrement_uniforme_stock();
