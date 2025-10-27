-- Add chat_session_id column to existing saved_contacts table

ALTER TABLE saved_contacts 
ADD COLUMN IF NOT EXISTS chat_session_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_contacts_chat_session_id ON saved_contacts(chat_session_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'saved_contacts'
ORDER BY ordinal_position;

