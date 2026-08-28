-- ============================================================
-- Data migration : fonction ENSEIGNANT(E) → ENSEIGNANT / ENSEIGNANTE
-- selon le sexe du personnel (M → ENSEIGNANT, F → ENSEIGNANTE)
-- ============================================================

-- 1) Aperçu des lignes concernées (facultatif)
-- SELECT id, matricule, nom, prenom, sexe, fonction
-- FROM public.personnel
-- WHERE UPPER(REPLACE(fonction, ' ', '')) = 'ENSEIGNANT(E)'
-- ORDER BY nom;

-- 2) Mise à jour
UPDATE public.personnel
SET fonction = CASE
    WHEN UPPER(COALESCE(sexe, '')) = 'F' THEN 'ENSEIGNANTE'
    ELSE 'ENSEIGNANT'
  END
WHERE UPPER(REPLACE(fonction, ' ', '')) = 'ENSEIGNANT(E)';

-- 3) Vérification : doit retourner 0 ligne
-- SELECT count(*) AS restants
-- FROM public.personnel
-- WHERE UPPER(REPLACE(fonction, ' ', '')) = 'ENSEIGNANT(E)';
