-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organization_members table (junction table for many-to-many relationship)
CREATE TABLE IF NOT EXISTS organization_members (
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- e.g., 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite primary key to prevent duplicate memberships
  PRIMARY KEY (user_id, org_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(org_id);

-- Create trigger to auto-update organizations.updated_at
CREATE OR REPLACE FUNCTION update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_organizations_updated_at();

-- Grant access
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organizations TO anon;
GRANT ALL ON organization_members TO authenticated;
GRANT ALL ON organization_members TO anon;

-- Insert example organizations
INSERT INTO organizations (name, description) VALUES
  ('Roux Institute', 'Graduate students and faculty at Northeastern University Roux Institute'),
  ('Nexus Maine', 'Maine innovation and entrepreneurship community network')
ON CONFLICT DO NOTHING;

-- Verify table creation
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('organizations', 'organization_members')
ORDER BY table_name, ordinal_position;

