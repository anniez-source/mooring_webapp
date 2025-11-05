-- Cleanup: Remove chat_sessions and chat_messages tables
-- Update saved_contacts to remove chat_session_id dependency

-- Step 1: Remove chat_session_id from saved_contacts (it's nullable, safe to drop)
ALTER TABLE saved_contacts DROP COLUMN IF EXISTS chat_session_id;

-- Step 2: Drop chat_messages table (child table first)
DROP TABLE IF EXISTS chat_messages CASCADE;

-- Step 3: Drop chat_sessions table
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Verify cleanup
COMMENT ON TABLE saved_contacts IS 'Tracks user saves - now works independently without chat_session_id';





