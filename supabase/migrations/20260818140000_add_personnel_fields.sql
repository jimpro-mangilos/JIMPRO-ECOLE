-- Ajout des champs détaillés au personnel
ALTER TABLE public.personnel
  ADD COLUMN IF NOT EXISTS etat_civil text,
  ADD COLUMN IF NOT EXISTS nombre_enfants int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS niveau_etude_id uuid REFERENCES public.niveaux_etude(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS piece_etude text,
  ADD COLUMN IF NOT EXISTS nationalite text,
  ADD COLUMN IF NOT EXISTS date_naissance date,
  ADD COLUMN IF NOT EXISTS intitule_compte text,
  ADD COLUMN IF NOT EXISTS num_compte text;
