-- ============================================================
-- Heures de service par fonction (pointage)
-- Chaque fonction peut avoir sa propre heure d'entrée / de sortie,
-- utilisée pour déterminer les retards et absences dans le pointage.
-- Ex : Enseignant 07:15-13:00, Gardien 06:00-14:00...
-- Si une fonction n'a pas d'heures renseignées, on utilise les
-- heures globales de l'école (app_settings pointage_heure_entree/sortie).
-- ============================================================

ALTER TABLE public.fonctions_personnel
  ADD COLUMN IF NOT EXISTS heure_entree text,
  ADD COLUMN IF NOT EXISTS heure_sortie text;
