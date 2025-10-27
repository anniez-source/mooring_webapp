-- Add org_id column to chat_sessions table for multi-tenancy

ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(org_id) ON DELETE SET NULL;

-- Create index for faster org-based queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_org_id ON chat_sessions(org_id);

-- Optional: Backfill org_id for existing sessions
-- This assigns existing sessions to the user's first organization
UPDATE chat_sessions cs
SET org_id = (
  SELECT om.org_id 
  FROM organization_members om
  WHERE om.user_id = cs.user_id
  LIMIT 1
)
WHERE cs.org_id IS NULL;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'chat_sessions' 
AND column_name = 'org_id';

