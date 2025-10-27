-- Create saved_contacts table to store user's saved connections

CREATE TABLE IF NOT EXISTS saved_contacts (
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  saved_profile_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  chat_session_id TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite primary key
  PRIMARY KEY (user_id, saved_profile_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_contacts_user_id ON saved_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_contacts_saved_profile_id ON saved_contacts(saved_profile_id);
CREATE INDEX IF NOT EXISTS idx_saved_contacts_created_at ON saved_contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_contacts_chat_session_id ON saved_contacts(chat_session_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_saved_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_contacts_updated_at
  BEFORE UPDATE ON saved_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_contacts_updated_at();

-- Grant access
GRANT ALL ON saved_contacts TO authenticated;
GRANT ALL ON saved_contacts TO anon;

-- Verify table creation
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'saved_contacts'
ORDER BY ordinal_position;

