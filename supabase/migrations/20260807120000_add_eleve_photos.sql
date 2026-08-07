/*
  # Add student photo support

  1. Add photo_url column to eleves table
  2. Create photos storage bucket (public)
  3. Add storage policies for admins and it_manager
*/

-- Add photo_url to eleves
ALTER TABLE eleves ADD COLUMN IF NOT EXISTS photo_url text;

-- Create photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

-- Allow admins and it managers to upload
CREATE POLICY "photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos' AND public.is_admin_or_it_manager());

-- Allow admins and it managers to update/delete
CREATE POLICY "photos_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'photos' AND public.is_admin_or_it_manager())
  WITH CHECK (bucket_id = 'photos' AND public.is_admin_or_it_manager());
