CREATE OR REPLACE FUNCTION is_chat_participant(conv_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM chat_participants WHERE conversation_id = conv_id AND user_id = auth.uid()); $$;

DROP POLICY IF EXISTS "View private conversations if participant" ON chat_conversations;
DROP POLICY IF EXISTS "View participants in own conversations" ON chat_participants;
DROP POLICY IF EXISTS "Join conversations as self" ON chat_participants;
DROP POLICY IF EXISTS "Insert participant if self or already in conversation" ON chat_participants;
DROP POLICY IF EXISTS "View messages in private conversations if participant" ON chat_messages;

CREATE POLICY "View private conversations if participant" ON chat_conversations FOR SELECT TO authenticated USING (type = 'private' AND is_chat_participant(id));
CREATE POLICY "View participants in own conversations" ON chat_participants FOR SELECT TO authenticated USING (is_chat_participant(conversation_id));
CREATE POLICY "Insert participant if self or already in conversation" ON chat_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_chat_participant(conversation_id));
CREATE POLICY "View messages in private conversations if participant" ON chat_messages FOR SELECT TO authenticated USING (is_chat_participant(conversation_id));
