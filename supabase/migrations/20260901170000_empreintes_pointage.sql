-- ============================================================
-- Pointage par EMPREINTE (borne physique) — couplage avec un
-- lecteur d'empreintes à l'école.
--  · empreintes_personnel : correspondance empreinte (réf. lecteur)
--    ↔ membre du personnel. AUCUNE donnée biométrique n'est stockée
--    ici : seul l'identifiant d'empreinte côté appareil.
--  · colonne source sur pointages_personnel (qr | manuel | empreinte)
--  · fonction pointer_personnel_borne() : UNE SEULE logique arrivée /
--    départ, appelée par la borne (et utilisable par les portails)
-- ============================================================

-- 1) Source du pointage
ALTER TABLE public.pointages_personnel ADD COLUMN IF NOT EXISTS source text;

-- 2) Correspondance empreinte ↔ personnel
CREATE TABLE IF NOT EXISTS public.empreintes_personnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  personnel_id uuid NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  appareil_id text NOT NULL DEFAULT 'borne1',
  empreinte_ref text NOT NULL,          -- identifiant d'empreinte côté lecteur (ex : slot 12)
  doigt text,                            -- ex : 'droite-index', 'gauche-pouce'...
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ecole_id, appareil_id, empreinte_ref)
);

CREATE INDEX IF NOT EXISTS idx_empreintes_personnel_ecole ON public.empreintes_personnel (ecole_id);
CREATE INDEX IF NOT EXISTS idx_empreintes_personnel_personnel ON public.empreintes_personnel (personnel_id);

ALTER TABLE public.empreintes_personnel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "empreintes_select" ON public.empreintes_personnel;
CREATE POLICY "empreintes_select" ON public.empreintes_personnel FOR SELECT TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "empreintes_insert" ON public.empreintes_personnel;
CREATE POLICY "empreintes_insert" ON public.empreintes_personnel FOR INSERT TO authenticated
  WITH CHECK (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

DROP POLICY IF EXISTS "empreintes_delete" ON public.empreintes_personnel;
CREATE POLICY "empreintes_delete" ON public.empreintes_personnel FOR DELETE TO authenticated
  USING (ecole_id = get_current_ecole_id() OR get_current_ecole_id() IS NULL);

-- 3) Fonction UNIQUE de pointage (arrivée → départ → déjà complet)
--    Appelée par la borne : la logique reste identique à celle du portail.
--    Retour : 'arrivee:present' | 'arrivee:retard' | 'depart' | 'deja_complet'
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
    -- Arrivée
    INSERT INTO public.pointages_personnel
      (ecole_id, personnel_id, date_pointage, heure_arrivee, statut, source)
    VALUES (p_ecole, p_personnel, p_date, v_heure,
            CASE WHEN v_heure > v_entree THEN 'retard' ELSE 'present' END,
            p_source)
    ON CONFLICT (personnel_id, date_pointage) DO NOTHING;
    RETURN CASE WHEN v_heure > v_entree THEN 'arrivee:retard' ELSE 'arrivee:present' END;
  ELSIF v_rec.heure_depart IS NULL THEN
    -- Départ
    UPDATE public.pointages_personnel
    SET heure_depart = v_heure
    WHERE id = v_rec.id;
    RETURN 'depart';
  ELSE
    RETURN 'deja_complet';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pointer_personnel_borne(uuid, uuid, date, time, text) TO authenticated;
