-- ============================================================
-- Fix: remplace les UNIQUE globaux par UNIQUE(ecole_id, champ)
-- ============================================================
-- Plusieurs tables ont des contraintes UNIQUE globales qui
-- empêchent deux écoles d'avoir des entrées avec le même nom.
-- On les remplace par des contraintes composites par école.
--
-- ⚠ VERSION IDEMPOTENTE : chaque ADD CONSTRAINT est gardé par un
--   test IF NOT EXISTS. Le script peut être relancé sans erreur
--   même si une exécution précédente s'est arrêtée à mi-chemin
--   (état partiel) ou si une partie a déjà été appliquée.
-- ============================================================

-- 1. section_prefixes : UNIQUE(ecole_id, section)
ALTER TABLE section_prefixes DROP CONSTRAINT IF EXISTS section_prefixes_section_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'section_prefixes_ecole_section_key'
      AND conrelid = 'section_prefixes'::regclass
  ) THEN
    ALTER TABLE section_prefixes ADD CONSTRAINT section_prefixes_ecole_section_key UNIQUE (ecole_id, section);
  END IF;
END $$;

-- 2. types_uniforme : UNIQUE(ecole_id, libelle)
ALTER TABLE types_uniforme DROP CONSTRAINT IF EXISTS types_uniforme_libelle_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'types_uniforme_ecole_libelle_key'
      AND conrelid = 'types_uniforme'::regclass
  ) THEN
    ALTER TABLE types_uniforme ADD CONSTRAINT types_uniforme_ecole_libelle_key UNIQUE (ecole_id, libelle);
  END IF;
END $$;

-- 3. types_paiement : UNIQUE(ecole_id, libelle)
ALTER TABLE types_paiement DROP CONSTRAINT IF EXISTS types_paiement_libelle_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'types_paiement_ecole_libelle_key'
      AND conrelid = 'types_paiement'::regclass
  ) THEN
    ALTER TABLE types_paiement ADD CONSTRAINT types_paiement_ecole_libelle_key UNIQUE (ecole_id, libelle);
  END IF;
END $$;

-- 4. motifs_paiement : UNIQUE(ecole_id, libelle)
ALTER TABLE motifs_paiement DROP CONSTRAINT IF EXISTS motifs_paiement_libelle_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'motifs_paiement_ecole_libelle_key'
      AND conrelid = 'motifs_paiement'::regclass
  ) THEN
    ALTER TABLE motifs_paiement ADD CONSTRAINT motifs_paiement_ecole_libelle_key UNIQUE (ecole_id, libelle);
  END IF;
END $$;

-- 5. sections : UNIQUE(ecole_id, nom)
ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_nom_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sections_ecole_nom_key'
      AND conrelid = 'sections'::regclass
  ) THEN
    ALTER TABLE sections ADD CONSTRAINT sections_ecole_nom_key UNIQUE (ecole_id, nom);
  END IF;
END $$;

-- 6. classes : UNIQUE(ecole_id, nom, section_id)
--    (une classe est identifiée par école + nom + section, comme les options)
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_nom_key;
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_ecole_nom_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'classes_ecole_nom_section_key'
      AND conrelid = 'classes'::regclass
  ) THEN
    ALTER TABLE classes ADD CONSTRAINT classes_ecole_nom_section_key UNIQUE (ecole_id, nom, section_id);
  END IF;
END $$;

-- 7. options : UNIQUE(ecole_id, nom, section_id)
ALTER TABLE options DROP CONSTRAINT IF EXISTS options_nom_section_id_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'options_ecole_nom_section_key'
      AND conrelid = 'options'::regclass
  ) THEN
    ALTER TABLE options ADD CONSTRAINT options_ecole_nom_section_key UNIQUE (ecole_id, nom, section_id);
  END IF;
END $$;

-- 8. stock_uniformes : UNIQUE(ecole_id, type_uniforme_id, annee_scolaire, section)
--    ⚠ La contrainte globale actuelle s'appelle unique_stock_par_article_annee_section
--    (renommée par la migration 20260423215342). L'ancienne nommée
--    unique_stock_par_article_annee n'existe plus — on supprime les deux pour être sûr.
ALTER TABLE stock_uniformes DROP CONSTRAINT IF EXISTS unique_stock_par_article_annee;
ALTER TABLE stock_uniformes DROP CONSTRAINT IF EXISTS unique_stock_par_article_annee_section;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stock_ecole_article_annee_section_key'
      AND conrelid = 'stock_uniformes'::regclass
  ) THEN
    ALTER TABLE stock_uniformes ADD CONSTRAINT stock_ecole_article_annee_section_key
      UNIQUE (ecole_id, type_uniforme_id, annee_scolaire, section);
  END IF;
END $$;
