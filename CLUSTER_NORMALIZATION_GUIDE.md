# Community Clusters Normalization Guide

## Overview

This guide documents the normalization of the `community_clusters` table from using PostgreSQL array columns (`member_ids[]`, `member_count`) to a proper relational design with a junction table.

## What Changed

### Before (Denormalized)
```sql
CREATE TABLE community_clusters (
  cluster_id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(org_id),
  label TEXT,
  keywords TEXT[],
  member_count INTEGER,    -- ❌ Denormalized
  member_ids UUID[],       -- ❌ Array column
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### After (Normalized)
```sql
CREATE TABLE community_clusters (
  cluster_id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(org_id),
  label TEXT,
  keywords TEXT[],
  parent_cluster_id UUID REFERENCES community_clusters(cluster_id),
  depth INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE cluster_members (
  cluster_id UUID REFERENCES community_clusters(cluster_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ,
  PRIMARY KEY (cluster_id, user_id)
);
```

## Benefits of Normalization

1. **Better Performance**: Indexed lookups instead of array operations
2. **Data Integrity**: Foreign key constraints ensure members exist
3. **Flexibility**: Easy to query members, add member-specific metadata
4. **Standards Compliance**: Follows relational database best practices
5. **Scalability**: No array size limits, better for large clusters

## Migration Steps

### Step 1: Run the Migration SQL

Run the migration file to create the new table structure and migrate existing data:

```bash
psql -d your_database < normalize_community_clusters.sql
```

This will:
- Create the `cluster_members` junction table
- Migrate existing `member_ids` data to the junction table
- Add `parent_cluster_id` and `depth` columns for hierarchical clustering
- Create necessary indexes

### Step 2: Verify the Migration

Check that data was migrated correctly:

```sql
-- Compare member counts
SELECT 
  cc.cluster_id,
  cc.label,
  array_length(cc.member_ids, 1) as old_count,
  COUNT(cm.user_id) as new_count
FROM community_clusters cc
LEFT JOIN cluster_members cm ON cc.cluster_id = cm.cluster_id
GROUP BY cc.cluster_id, cc.label, cc.member_ids;
```

### Step 3: Drop Old Columns (Optional)

Once you've verified everything works, uncomment and run these lines in the migration file:

```sql
ALTER TABLE community_clusters DROP COLUMN IF EXISTS member_ids;
ALTER TABLE community_clusters DROP COLUMN IF EXISTS member_count;
```

## Updated Code

### API Routes

All API routes have been updated to use JOIN queries instead of array operations:

- ✅ `/app/api/clusters/route.ts` - Lists clusters with counts from junction table
- ✅ `/app/api/clusters/[clusterId]/members/route.ts` - Gets cluster members via JOIN

### Scripts

The clustering script has been updated to insert into both tables:

- ✅ `/scripts/detect-clusters.js` - Creates clusters and cluster_members entries

### Frontend

No changes needed! The API maintains backward compatibility by transforming the response to include `member_count` and `member_ids` fields.

## Query Examples

### Get all clusters with member counts
```sql
SELECT 
  cc.cluster_id,
  cc.label,
  cc.keywords,
  COUNT(cm.user_id) as member_count
FROM community_clusters cc
LEFT JOIN cluster_members cm ON cc.cluster_id = cm.cluster_id
WHERE cc.org_id = 'your-org-id'
  AND cc.parent_cluster_id IS NULL  -- Top-level only
GROUP BY cc.cluster_id, cc.label, cc.keywords
ORDER BY member_count DESC;
```

### Get cluster members with profile details
```sql
SELECT 
  p.user_id,
  p.name,
  p.email,
  p.background,
  p.expertise
FROM cluster_members cm
JOIN profiles p ON cm.user_id = p.user_id
WHERE cm.cluster_id = 'specific-cluster-id'
  AND p.opted_in = true;
```

### Get user's clusters
```sql
SELECT 
  cc.cluster_id,
  cc.label,
  cc.keywords,
  COUNT(*) OVER (PARTITION BY cc.cluster_id) as member_count
FROM cluster_members cm
JOIN community_clusters cc ON cm.cluster_id = cc.cluster_id
WHERE cm.user_id = 'specific-user-id'
  AND cc.depth = 0;  -- Top-level clusters only
```

### Get hierarchical clusters (parent + subclusters)
```sql
WITH RECURSIVE cluster_hierarchy AS (
  -- Base case: top-level clusters
  SELECT 
    cluster_id,
    label,
    parent_cluster_id,
    depth,
    ARRAY[cluster_id] as path
  FROM community_clusters
  WHERE parent_cluster_id IS NULL
    AND org_id = 'your-org-id'
  
  UNION ALL
  
  -- Recursive case: subclusters
  SELECT 
    cc.cluster_id,
    cc.label,
    cc.parent_cluster_id,
    cc.depth,
    ch.path || cc.cluster_id
  FROM community_clusters cc
  JOIN cluster_hierarchy ch ON cc.parent_cluster_id = ch.cluster_id
)
SELECT 
  ch.*,
  COUNT(cm.user_id) as member_count
FROM cluster_hierarchy ch
LEFT JOIN cluster_members cm ON ch.cluster_id = cm.cluster_id
GROUP BY ch.cluster_id, ch.label, ch.parent_cluster_id, ch.depth, ch.path
ORDER BY ch.depth, ch.label;
```

## Troubleshooting

### Issue: Old queries still trying to use member_ids

**Solution**: Update all queries to use JOINs. Search your codebase:
```bash
grep -r "member_ids\|member_count" app/ scripts/
```

### Issue: Duplicate entries in cluster_members

**Solution**: The PRIMARY KEY constraint prevents this, but if you have duplicates:
```sql
DELETE FROM cluster_members a
USING cluster_members b
WHERE a.ctid < b.ctid
  AND a.cluster_id = b.cluster_id
  AND a.user_id = b.user_id;
```

### Issue: Performance concerns with JOINs

**Solution**: Indexes are already created. Verify with:
```sql
\d cluster_members
```

You should see indexes on both `cluster_id` and `user_id`.

## Supabase Considerations

If you're using Supabase, the nested select syntax works perfectly:

```typescript
const { data } = await supabase
  .from('community_clusters')
  .select(`
    cluster_id,
    label,
    keywords,
    cluster_members(user_id)
  `)
  .eq('org_id', orgId);

// Transform the result
const clustersWithCounts = data.map(cluster => ({
  ...cluster,
  member_count: cluster.cluster_members?.length || 0
}));
```

## Next Steps

1. ✅ Run the migration SQL
2. ✅ Verify data migration
3. ✅ Test the updated API endpoints
4. ✅ Run the clustering script to generate new clusters
5. ⏳ Monitor performance in production
6. ⏳ Drop old columns after 1-2 weeks of stability

## Rollback Plan

If you need to rollback:

1. Restore `member_ids` and `member_count` columns
2. Repopulate from junction table:
```sql
UPDATE community_clusters cc
SET 
  member_ids = ARRAY(
    SELECT user_id 
    FROM cluster_members 
    WHERE cluster_id = cc.cluster_id
  ),
  member_count = (
    SELECT COUNT(*) 
    FROM cluster_members 
    WHERE cluster_id = cc.cluster_id
  );
```

## Questions?

This normalization follows standard relational database design principles. The junction table pattern is widely used and battle-tested for many-to-many relationships.





