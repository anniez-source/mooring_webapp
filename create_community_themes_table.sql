-- Create table for storing community theme analysis

CREATE TABLE IF NOT EXISTS community_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
  themes JSONB NOT NULL,
  member_count INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_community_themes_org_id ON community_themes(org_id);
CREATE INDEX IF NOT EXISTS idx_community_themes_generated_at ON community_themes(generated_at DESC);

-- Grant permissions
GRANT ALL ON community_themes TO authenticated;
GRANT SELECT ON community_themes TO anon;

-- Verify table creation
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'community_themes'
ORDER BY ordinal_position;

