-- ============================================================
-- Pointage : gérer les pointages multiples dans la journée
-- (arrivée → pause → reprise → départ).
-- ============================================================
-- Avant : pointer_personnel_borne() considérait le 2e pointage du
-- jour comme le départ, puis renvoyait 'deja_complet' pour tout
-- pointage suivant. En cas de pause déjeuner, le départ était donc
-- enregistré à midi au lieu du soir.
--
-- Après : le DERNIER pointage du jour écrase l'heure de départ.
--   - 1er pointage     → arrivée (present/retard selon l'heure d'entrée)
--   - pointages suiv.  → heure_depart mise à jour (le dernier gagne)
-- ============================================================

CREATE OR REPLACE FUNCTION public.pointer_personnel_borne(
  p_ecole uuid,
  p_personnel uuid,
  p_date date DEFAULT CURRENT_DATE,
  p_heure time DEFAULT NULL,
  p_source text DEFAULT 'empreinte'
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_entree time;
  v_rec record;
  v_heure time := COALESCE(p_heure, (now() AT TIME ZONE 'Africa/Lubumbashi')::time);
BEGIN
  -- Heure d'entrée configurée (pointage_heure_entree), défaut 08:00
  BEGIN
    SELECT value::time INTO v_entree
    FROM public.app_settings
    WHERE ecole_id = p_ecole AND key = 'pointage_heure_entree';
  EXCEPTION WHEN OTHERS THEN
    v_entree := NULL;
  END;
  IF v_entree IS NULL THEN v_entree := '08:00'::time; END IF;

  SELECT * INTO v_rec
  FROM public.pointages_personnel
  WHERE ecole_id = p_ecole AND personnel_id = p_personnel AND date_pointage = p_date;

  IF v_rec.id IS NULL THEN
    -- 1er pointage du jour → arrivée
    INSERT INTO public.pointages_personnel
      (ecole_id, personnel_id, date_pointage, heure_arrivee, statut, source)
    VALUES (p_ecole, p_personnel, p_date, v_heure,
            CASE WHEN v_heure > v_entree THEN 'retard' ELSE 'present' END,
            p_source)
    ON CONFLICT (personnel_id, date_pointage) DO NOTHING;
    RETURN CASE WHEN v_heure > v_entree THEN 'arrivee:retard' ELSE 'arrivee:present' END;
  ELSE
    -- Pointage suivant → départ (le dernier pointage du jour gagne,
    -- ce qui gère les pauses déjeuner).
    UPDATE public.pointages_personnel
    SET heure_depart = v_heure
    WHERE id = v_rec.id;
    RETURN 'depart';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pointer_personnel_borne(uuid, uuid, date, time, text) TO authenticated;
