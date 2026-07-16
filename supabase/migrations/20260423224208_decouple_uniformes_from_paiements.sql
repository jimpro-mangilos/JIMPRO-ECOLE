/*
  # Découplage des Uniformes de la table Paiements

  Les distributions d'uniformes ne sont plus facturées et ne doivent plus
  apparaître dans la rubrique Paiements. Cette migration :

  1. Supprime toutes les lignes de `paiements` liées au type "Uniformes".
     Ces entrées étaient créées en même temps qu'une distribution d'uniforme
     et deviennent obsolètes.
  2. Retire la clé étrangère `gestion_uniformes_paiement_id_fkey`.
  3. Supprime les colonnes `paiement_id` et `numero_recu` de `gestion_uniformes`.
  4. Supprime (soft) le type de paiement "Uniformes" en le désactivant
     (is_active = false) afin de conserver l'historique mais éviter sa
     sélection future.

  ## Notes
  - La table `gestion_fournitures` (ancienne gestion EPS/Pull) est conservée
    intacte à des fins d'historique, mais n'est plus utilisée par l'interface.
*/

-- 1) Supprimer d'abord les liens pour autoriser la suppression côté paiements
UPDATE public.gestion_uniformes
SET paiement_id = NULL
WHERE paiement_id IS NOT NULL;

-- 2) Supprimer les paiements dont le type correspond à "Uniformes"
DELETE FROM public.paiements
WHERE type_paiement IN (
  SELECT id FROM public.types_paiement WHERE libelle = 'Uniformes'
);

-- 3) Supprimer la contrainte de clé étrangère si elle existe encore
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'gestion_uniformes_paiement_id_fkey'
      AND table_name = 'gestion_uniformes'
  ) THEN
    ALTER TABLE public.gestion_uniformes
      DROP CONSTRAINT gestion_uniformes_paiement_id_fkey;
  END IF;
END $$;

-- 4) Supprimer les colonnes paiement_id et numero_recu
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gestion_uniformes' AND column_name = 'paiement_id'
  ) THEN
    ALTER TABLE public.gestion_uniformes DROP COLUMN paiement_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gestion_uniformes' AND column_name = 'numero_recu'
  ) THEN
    ALTER TABLE public.gestion_uniformes DROP COLUMN numero_recu;
  END IF;
END $$;

-- 5) Désactiver le type de paiement "Uniformes"
UPDATE public.types_paiement
SET is_active = false
WHERE libelle = 'Uniformes';
