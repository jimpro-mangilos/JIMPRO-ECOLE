-- ============================================================
-- Évolutions du module Chat :
-- pièces jointes, annonces épinglées, groupes, réactions,
-- réponses, édition/suppression, diffusion ciblée, mémos vocaux
-- ============================================================

-- ── chat_messages : pièces jointes, épingles, réponses, édition, suppression ──
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_nom text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_type text;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS pinned_by uuid;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES chat_messages(id) ON DELETE SET NULL;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS audio_url text;

-- autoriser les messages avec pièce jointe sans texte
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_content_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_content_check
  CHECK (char_length(content) > 0 OR attachment_url IS NOT NULL OR audio_url IS NOT NULL);

-- ── chat_conversations : groupes ──
ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_type_check;
ALTER TABLE chat_conversations ADD CONSTRAINT chat_conversations_type_check
  CHECK (type IN ('broadcast', 'private', 'group'));
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS nom text;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS created_by uuid;

-- ── Réactions ──
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON chat_message_reactions(message_id);
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_reactions_select" ON chat_message_reactions;
CREATE POLICY "chat_reactions_select" ON chat_message_reactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "chat_reactions_insert" ON chat_message_reactions;
CREATE POLICY "chat_reactions_insert" ON chat_message_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "chat_reactions_delete" ON chat_message_reactions;
CREATE POLICY "chat_reactions_delete" ON chat_message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── « En train d'écrire » ──
CREATE TABLE IF NOT EXISTS chat_typing (
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE chat_typing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_typing_select" ON chat_typing;
CREATE POLICY "chat_typing_select" ON chat_typing FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "chat_typing_upsert" ON chat_typing;
CREATE POLICY "chat_typing_upsert" ON chat_typing FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Bucket chat-files (pièces jointes + mémos vocaux) ──
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "chat_files_select" ON storage.objects;
CREATE POLICY "chat_files_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'chat-files');
DROP POLICY IF EXISTS "chat_files_insert" ON storage.objects;
CREATE POLICY "chat_files_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-files');
DROP POLICY IF EXISTS "chat_files_update" ON storage.objects;
CREATE POLICY "chat_files_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'chat-files');
DROP POLICY IF EXISTS "chat_files_delete" ON storage.objects;
CREATE POLICY "chat_files_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-files');
