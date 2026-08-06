CREATE TABLE IF NOT EXISTS chat_conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), type text NOT NULL CHECK (type IN ('broadcast', 'private')), created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS chat_participants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, joined_at timestamptz DEFAULT now(), UNIQUE(conversation_id, user_id));
CREATE TABLE IF NOT EXISTS chat_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, content text NOT NULL CHECK (char_length(content) > 0), created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE TABLE IF NOT EXISTS chat_message_reads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, read_at timestamptz DEFAULT now(), UNIQUE(message_id, user_id));
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_user_id ON chat_message_reads(user_id);
INSERT INTO chat_conversations (id, type) VALUES ('00000000-0000-0000-0000-000000000001', 'broadcast') ON CONFLICT (id) DO NOTHING;
