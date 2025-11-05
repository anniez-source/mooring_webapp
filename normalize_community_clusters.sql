-- Migration: Normalize community_clusters by creating cluster_members junction table
-- This removes member_ids and member_count arrays in favor of proper relational design

-- Step 1: Create the new cluster_members junction table
CREATE TABLE IF NOT EXISTS cluster_members (
    cluster_id UUID REFERENCES community_clusters(cluster_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (cluster_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_cluster_members_cluster_id ON cluster_members(cluster_id);
CREATE INDEX idx_cluster_members_user_id ON cluster_members(user_id);

-- Step 2: Migrate existing data from member_ids array to junction table
INSERT INTO cluster_members (cluster_id, user_id)
SELECT 
    cluster_id,
    unnest(member_ids) as user_id
FROM community_clusters
WHERE member_ids IS NOT NULL
ON CONFLICT (cluster_id, user_id) DO NOTHING;

-- Step 3: Add parent_cluster_id and depth columns if they don't exist
ALTER TABLE community_clusters 
ADD COLUMN IF NOT EXISTS parent_cluster_id UUID REFERENCES community_clusters(cluster_id) ON DELETE SET NULL;

ALTER TABLE community_clusters 
ADD COLUMN IF NOT EXISTS depth INT DEFAULT 0;

-- Create index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_community_clusters_parent_id ON community_clusters(parent_cluster_id);

-- Step 4: Drop the old array columns (only after data is migrated!)
-- Uncomment these lines once you've verified the migration worked:
-- ALTER TABLE community_clusters DROP COLUMN IF EXISTS member_ids;
-- ALTER TABLE community_clusters DROP COLUMN IF EXISTS member_count;

-- Verification queries (uncomment to run):
-- SELECT cluster_id, label, COUNT(*) as member_count 
-- FROM cluster_members 
-- GROUP BY cluster_id, label 
-- ORDER BY member_count DESC;

COMMENT ON TABLE cluster_members IS 'Junction table linking clusters to their member users';
COMMENT ON COLUMN community_clusters.parent_cluster_id IS 'References parent cluster for hierarchical clustering';
COMMENT ON COLUMN community_clusters.depth IS 'Cluster depth: 0 for top-level, 1 for subclusters';





