-- ============================================================
-- Agent de recouvrement
-- Le portail de recouvrement est désormais protégé : un agent
-- doit s'identifier (scan QR carte de service ou saisie matricule)
-- avant de pouvoir vérifier les paiements des élèves.
-- ============================================================

-- 1. Marqueur sur le personnel : qui est agent de recouvrement ?
ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS est_agent_recouvrement boolean NOT NULL DEFAULT false;

-- 2. Fonction « Agent de recouvrement » dans les listes par défaut
--    (ajoutée aux écoles qui n'en ont pas encore)
INSERT INTO public.fonctions_personnel (ecole_id, libelle, ordre, is_active)
SELECT e.id, 'Agent de recouvrement', 12, true
FROM public.ecoles e
WHERE NOT EXISTS (
  SELECT 1 FROM public.fonctions_personnel fp
  WHERE fp.ecole_id = e.id AND fp.libelle ILIKE 'agent de recouvrement'
);

-- 3. Session agent : table (ou plutôt app_settings-like) — on garde la
--    session côté client (sessionStorage) : aucune table supplémentaire.
