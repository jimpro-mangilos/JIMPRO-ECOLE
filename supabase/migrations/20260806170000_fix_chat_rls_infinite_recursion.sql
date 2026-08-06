/*
  # Fix Chat RLS - Infinite Recursion on chat_participants

  ## Problem
  The SELECT policy on `chat_participants` queries `chat_participants` itself,
  causing infinite recursion (HTTP 500 from PostgREST).

  ## Solution
  Use a SECURITY DEFINER function to check if the current user is a participant,
  bypassing RLS on the inner query.
*/

-- Drop the problematic self-referencing policy
DROP POLICY IF EXISTS "View participants in own conversations" ON chat_participants;

-- Create a security definer function that bypasses RLS
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

-- New SELECT policy using the function
CREATE POLICY "View participants in own conversations"
  ON chat_participants FOR SELECT
  TO authenticated
  USING (is_chat_participant(conversation_id));

-- Also fix chat_messages SELECT for private conversations which might have the same issue
-- (the broadcast policy is fine, but private conversations use chat_participants join)
DROP POLICY IF EXISTS "View messages in private conversations if participant" ON chat_messages;

CREATE POLICY "View messages in private conversations if participant"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations cc
      WHERE cc.id = chat_messages.conversation_id AND cc.type = 'private'
      AND is_chat_participant(chat_messages.conversation_id)
    )
  );
