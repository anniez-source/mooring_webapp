-- Create community_clusters table (normalized - no array columns)
CREATE TABLE IF NOT EXISTS community_clusters (
  cluster_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  keywords TEXT[],
  parent_cluster_id UUID REFERENCES community_clusters(cluster_id) ON DELETE SET NULL,
  depth INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cluster_members junction table for normalized many-to-many relationship
CREATE TABLE IF NOT EXISTS cluster_members (
  cluster_id UUID REFERENCES community_clusters(cluster_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (cluster_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_community_clusters_org_id ON community_clusters(org_id);
CREATE INDEX IF NOT EXISTS idx_community_clusters_parent_id ON community_clusters(parent_cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_members_cluster_id ON cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_members_user_id ON cluster_members(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_community_clusters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_community_clusters_updated_at
  BEFORE UPDATE ON community_clusters
  FOR EACH ROW
  EXECUTE FUNCTION update_community_clusters_updated_at();



