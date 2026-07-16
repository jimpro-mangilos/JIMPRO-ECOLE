/*
  # Fix chat_participants INSERT RLS policy

  ## Problem
  The original INSERT policy only allowed users to insert rows where user_id = auth.uid().
  This blocked inserting the OTHER participant when creating a private conversation,
  causing conversations to be created with only one participant.

  ## Fix
  Replace the restrictive INSERT policy with one that allows inserting a participant if:
  - The row being inserted is for the current user (self), OR
  - The current user is already a participant in the same conversation
    (meaning they just created it and are adding the other person)

  This preserves security: no one can add someone to a conversation they don't belong to.
*/

DROP POLICY IF EXISTS "Join conversations as self" ON chat_participants;

CREATE POLICY "Insert participant if self or already in conversation"
  ON chat_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id = chat_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );
