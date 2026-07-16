/*
  # Ajout des champs d'annulation sur la table paiements

  ## Modifications apportées
  
  ### Table `paiements`
  - Ajout colonne `statut` (text) : valeurs possibles `en_attente`, `encaisse`, `annule`
    - Valeur par défaut : `en_attente`
    - Contrainte CHECK pour valider les valeurs autorisées
  - Ajout colonne `motif_annulation` (text) : raison de l'annulation
  - Ajout colonne `annule_par` (uuid) : identifiant de l'utilisateur qui a annulé
  - Ajout colonne `date_annulation` (timestamptz) : date et heure de l'annulation
  
  ### Migration des données existantes
  - Les paiements avec `est_encaisse = true` passent au statut `encaisse`
  - Les paiements avec `est_encaisse = false` gardent le statut `en_attente`

  ## Notes importantes
  - Aucune donnée n'est supprimée
  - La colonne `est_encaisse` est conservée pour compatibilité
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'statut'
  ) THEN
    ALTER TABLE paiements ADD COLUMN statut text NOT NULL DEFAULT 'en_attente'
      CHECK (statut IN ('en_attente', 'encaisse', 'annule'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'motif_annulation'
  ) THEN
    ALTER TABLE paiements ADD COLUMN motif_annulation text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'annule_par'
  ) THEN
    ALTER TABLE paiements ADD COLUMN annule_par uuid REFERENCES auth.users(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'date_annulation'
  ) THEN
    ALTER TABLE paiements ADD COLUMN date_annulation timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paiements' AND column_name = 'nom_annuleur'
  ) THEN
    ALTER TABLE paiements ADD COLUMN nom_annuleur text;
  END IF;
END $$;

UPDATE paiements SET statut = 'encaisse' WHERE est_encaisse = true AND statut = 'en_attente';
