-- Drop the existing chat_sessions table if it exists
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Create chat_sessions table with correct foreign key reference
CREATE TABLE chat_sessions (
  chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

-- Create index for faster lookups
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_chat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_sessions_updated_at();

-- Grant access
GRANT ALL ON chat_sessions TO authenticated;
GRANT ALL ON chat_sessions TO anon;

-- Verify the table was created correctly
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'chat_sessions'
ORDER BY ordinal_position;

