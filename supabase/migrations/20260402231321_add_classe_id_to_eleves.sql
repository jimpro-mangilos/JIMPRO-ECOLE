/*
  # Ajout de la colonne classe_id dans la table eleves

  1. Modifications
    - Ajout de la colonne `classe_id` (uuid, nullable) dans la table eleves
    - Clé étrangère vers la table classes
    - Conservation temporaire du champ `classe` (text) pour compatibilité

  2. Contraintes
    - Clé étrangère vers classes avec ON DELETE SET NULL
    - Index sur classe_id pour optimiser les requêtes

  3. Notes
    - La colonne est nullable pour permettre la migration progressive
    - Le champ texte `classe` existant est conservé pendant la transition
*/

-- Ajouter la colonne classe_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'eleves' AND column_name = 'classe_id'
  ) THEN
    ALTER TABLE eleves ADD COLUMN classe_id uuid REFERENCES classes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Créer un index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_eleves_classe_id ON eleves(classe_id);