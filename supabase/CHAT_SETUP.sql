-- ============================================================
-- CHAT MODULE — Complete setup for Supabase SQL Editor
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Create tables
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('broadcast', 'private')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

CREATE TABLE IF NOT EXISTS chat_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_reads_user_id ON chat_message_reads(user_id);

-- Seed broadcast conversation
INSERT INTO chat_conversations (id, type)
VALUES ('00000000-0000-0000-0000-000000000001', 'broadcast')
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reads ENABLE ROW LEVEL SECURITY;

-- 3. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_message_reads;

-- 4. Create security definer function (avoids infinite recursion)
CREATE OR REPLACE FUNCTION is_chat_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;

-- 5. RLS Policies

-- chat_conversations
CREATE POLICY "View broadcast conversations" ON chat_conversations FOR SELECT TO authenticated USING (type = 'broadcast');
CREATE POLICY "View private conversations if participant" ON chat_conversations FOR SELECT TO authenticated USING (type = 'private' AND is_chat_participant(id));
CREATE POLICY "Create conversations" ON chat_conversations FOR INSERT TO authenticated WITH CHECK (true);

-- chat_participants
CREATE POLICY "View participants in own conversations" ON chat_participants FOR SELECT TO authenticated USING (is_chat_participant(conversation_id));
CREATE POLICY "Insert participant if self or already in conversation" ON chat_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_chat_participant(conversation_id));

-- chat_messages
CREATE POLICY "View messages in broadcast conversations" ON chat_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM chat_conversations cc WHERE cc.id = chat_messages.conversation_id AND cc.type = 'broadcast'));
CREATE POLICY "View messages in private conversations if participant" ON chat_messages FOR SELECT TO authenticated USING (is_chat_participant(conversation_id));
CREATE POLICY "Send own messages" ON chat_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- chat_message_reads
CREATE POLICY "View own read receipts" ON chat_message_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Mark messages as read for self" ON chat_message_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
