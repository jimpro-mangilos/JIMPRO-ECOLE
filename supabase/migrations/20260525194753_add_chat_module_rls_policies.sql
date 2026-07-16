/*
  # Add Chat Module - RLS Policies

  Adds Row Level Security policies for all chat tables.
  Separated from table creation to avoid forward-reference issues.

  ## Policies added:
  - chat_conversations: view broadcast, view private if participant, insert
  - chat_participants: view own/co-participants, insert self
  - chat_messages: view broadcast messages, view private messages if participant, insert own
  - chat_message_reads: view own reads, insert own reads
*/

-- chat_conversations policies
CREATE POLICY "View broadcast conversations"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (type = 'broadcast');

CREATE POLICY "View private conversations if participant"
  ON chat_conversations FOR SELECT
  TO authenticated
  USING (
    type = 'private' AND
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.conversation_id = chat_conversations.id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Create conversations"
  ON chat_conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- chat_participants policies
CREATE POLICY "View participants in own conversations"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.conversation_id = chat_participants.conversation_id
      AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "Join conversations as self"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- chat_messages policies
CREATE POLICY "View messages in broadcast conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations cc
      WHERE cc.id = chat_messages.conversation_id AND cc.type = 'broadcast'
    )
  );

CREATE POLICY "View messages in private conversations if participant"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = chat_messages.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Send own messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- chat_message_reads policies
CREATE POLICY "View own read receipts"
  ON chat_message_reads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Mark messages as read for self"
  ON chat_message_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
