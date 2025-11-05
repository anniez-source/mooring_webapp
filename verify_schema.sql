-- Verify that chat_session_id was actually dropped from saved_contacts

-- Check columns in saved_contacts
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'saved_contacts';

-- If chat_session_id still exists, drop it now
ALTER TABLE saved_contacts DROP COLUMN IF EXISTS chat_session_id CASCADE;

-- Verify it's gone
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'saved_contacts';





