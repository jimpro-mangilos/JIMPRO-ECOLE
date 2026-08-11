-- ============================================================
-- Fix: remplace les UNIQUE globaux par UNIQUE(ecole_id, champ)
-- ============================================================
-- Plusieurs tables ont des contraintes UNIQUE globales qui
-- empêchent deux écoles d'avoir des entrées avec le même nom.
-- On les remplace par des contraintes composites par école.
-- ============================================================

-- 1. section_prefixes : UNIQUE(ecole_id, section)
ALTER TABLE section_prefixes DROP CONSTRAINT IF EXISTS section_prefixes_section_key;
ALTER TABLE section_prefixes ADD CONSTRAINT section_prefixes_ecole_section_key UNIQUE (ecole_id, section);

-- 2. types_uniforme : UNIQUE(ecole_id, libelle)
ALTER TABLE types_uniforme DROP CONSTRAINT IF EXISTS types_uniforme_libelle_key;
ALTER TABLE types_uniforme ADD CONSTRAINT types_uniforme_ecole_libelle_key UNIQUE (ecole_id, libelle);

-- 3. types_paiement : UNIQUE(ecole_id, libelle)
ALTER TABLE types_paiement DROP CONSTRAINT IF EXISTS types_paiement_libelle_key;
ALTER TABLE types_paiement ADD CONSTRAINT types_paiement_ecole_libelle_key UNIQUE (ecole_id, libelle);

-- 4. motifs_paiement : UNIQUE(ecole_id, libelle)
ALTER TABLE motifs_paiement DROP CONSTRAINT IF EXISTS motifs_paiement_libelle_key;
ALTER TABLE motifs_paiement ADD CONSTRAINT motifs_paiement_ecole_libelle_key UNIQUE (ecole_id, libelle);

-- 5. sections : UNIQUE(ecole_id, nom)
ALTER TABLE sections DROP CONSTRAINT IF EXISTS sections_nom_key;
ALTER TABLE sections ADD CONSTRAINT sections_ecole_nom_key UNIQUE (ecole_id, nom);

-- 6. classes : UNIQUE(ecole_id, nom)
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_nom_key;
ALTER TABLE classes ADD CONSTRAINT classes_ecole_nom_key UNIQUE (ecole_id, nom);

-- 7. options : UNIQUE(ecole_id, nom, section_id)
ALTER TABLE options DROP CONSTRAINT IF EXISTS options_nom_section_id_key;
ALTER TABLE options ADD CONSTRAINT options_ecole_nom_section_key UNIQUE (ecole_id, nom, section_id);

-- 8. stock_uniformes : UNIQUE(ecole_id, type_uniforme_id, annee_scolaire, section)
ALTER TABLE stock_uniformes DROP CONSTRAINT IF EXISTS unique_stock_par_article_annee;
ALTER TABLE stock_uniformes ADD CONSTRAINT stock_ecole_article_annee_section_key UNIQUE (ecole_id, type_uniforme_id, annee_scolaire, section);
