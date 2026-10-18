-- ============================================================
-- Gestion des appareils (device trust)
--   · suivre les appareils connectés à chaque compte ;
--   · bloquer tout NOUVEL appareil en attente d'approbation ;
--   · seul l'IT Manager (ou l'admin) peut approuver/bloquer un appareil.
-- ============================================================

-- 1) Table des appareils par compte
CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ecole_id uuid NOT NULL REFERENCES public.ecoles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id text NOT NULL,               -- identifiant généré côté client (localStorage)
  device_name text,                      -- ex : 'Chrome sur Linux'
  user_agent text,                       -- user-agent complet (diagnostic)
  ip_address text,                       -- dernier IP (optionnel, non renseigné côté client)
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'blocked'
  last_seen_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_ecole ON public.user_devices (ecole_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON public.user_devices (user_id);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- 2) Helper : l'utilisateur courant peut-il approuver/bloquer les appareils ?
CREATE OR REPLACE FUNCTION public.is_device_approver()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid() AND r.nom IN ('it_manager', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_device_approver() TO authenticated;

-- 3) Politiques RLS
DROP POLICY IF EXISTS "user_devices_select" ON public.user_devices;
CREATE POLICY "user_devices_select" ON public.user_devices FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_device_approver());

DROP POLICY IF EXISTS "user_devices_update" ON public.user_devices;
CREATE POLICY "user_devices_update" ON public.user_devices FOR UPDATE TO authenticated
  USING (public.is_device_approver())
  WITH CHECK (public.is_device_approver());

DROP POLICY IF EXISTS "user_devices_delete" ON public.user_devices;
CREATE POLICY "user_devices_delete" ON public.user_devices FOR DELETE TO authenticated
  USING (public.is_device_approver());

-- 4) Enregistrement d'un appareil (appelé au chargement de l'app)
--    Retourne le statut : 'approved' | 'pending' | 'blocked'.
--    Les appareils des approbateurs (IT manager / admin) sont auto-approuvés.
CREATE OR REPLACE FUNCTION public.register_user_device(
  p_device_id text,
  p_device_name text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ecole uuid;
  v_is_approver boolean;
  v_status text;
BEGIN
  SELECT ecole_id INTO v_ecole FROM public.profiles WHERE id = auth.uid();

  SELECT public.is_device_approver() INTO v_is_approver;

  INSERT INTO public.user_devices
    (ecole_id, user_id, device_id, device_name, user_agent, status, last_seen_at)
  VALUES
    (v_ecole, auth.uid(), p_device_id, p_device_name, p_user_agent,
     CASE WHEN v_is_approver THEN 'approved' ELSE 'pending' END, now())
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET last_seen_at = now(),
                device_name = EXCLUDED.device_name,
                user_agent = EXCLUDED.user_agent
  RETURNING status INTO v_status;

  RETURN v_status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_user_device(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_user_device(text, text, text) TO authenticated;
