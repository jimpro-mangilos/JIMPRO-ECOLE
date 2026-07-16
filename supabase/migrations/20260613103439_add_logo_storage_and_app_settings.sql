-- Table to store app-wide settings (key-value)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_app_settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_app_settings" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_it_manager());

CREATE POLICY "update_app_settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin_or_it_manager())
  WITH CHECK (public.is_admin_or_it_manager());

CREATE POLICY "delete_app_settings" ON public.app_settings
  FOR DELETE TO authenticated
  USING (public.is_admin_or_it_manager());

-- Create logos storage bucket (public so images can be served without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for logos bucket
CREATE POLICY "logos_select" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

CREATE POLICY "logos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND public.is_admin_or_it_manager());

CREATE POLICY "logos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND public.is_admin_or_it_manager())
  WITH CHECK (bucket_id = 'logos' AND public.is_admin_or_it_manager());

CREATE POLICY "logos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND public.is_admin_or_it_manager());

-- Insert default logo setting
INSERT INTO public.app_settings (key, value)
VALUES ('logo_url', NULL)
ON CONFLICT (key) DO NOTHING;
