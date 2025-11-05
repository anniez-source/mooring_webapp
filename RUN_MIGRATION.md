# Quick Migration Steps

## 1. Run the Migration on Your Database

```bash
# If using Supabase locally or have psql access
psql -d your_database < normalize_community_clusters.sql

# Or via Supabase dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of normalize_community_clusters.sql
# 3. Run the query
```

## 2. Regenerate Clusters with New Structure

```bash
# Run the updated clustering script
node scripts/detect-clusters.js
```

This will now:
- Create clusters in `community_clusters` (without arrays)
- Create membership records in `cluster_members` junction table
- Support hierarchical clusters with `parent_cluster_id`

## 3. Test the Changes

```bash
# Start your dev server
npm run dev

# Navigate to /communities to see clusters
# Click into a cluster to see members
```

## 4. Verify Data

Check in Supabase dashboard or psql:

```sql
-- View clusters
SELECT * FROM community_clusters;

-- View cluster memberships
SELECT 
  cc.label,
  COUNT(cm.user_id) as member_count
FROM community_clusters cc
LEFT JOIN cluster_members cm ON cc.cluster_id = cm.cluster_id
GROUP BY cc.cluster_id, cc.label;
```

## What Was Updated

### ✅ Database Schema
- Created `cluster_members` junction table
- Added `parent_cluster_id` and `depth` columns to `community_clusters`
- Created indexes for performance

### ✅ API Routes
- `/app/api/clusters/route.ts` - Uses JOINs to get member counts
- `/app/api/clusters/[clusterId]/members/route.ts` - Gets members via junction table

### ✅ Scripts
- `scripts/detect-clusters.js` - Now inserts into both tables

### ✅ Schema Files
- `create_community_clusters_table.sql` - Updated with normalized structure
- `normalize_community_clusters.sql` - New migration file

### 🎯 Frontend
- No changes needed! The API maintains backward compatibility

## Optional: Drop Old Columns

After you've verified everything works for 1-2 weeks, you can drop the old columns:

```sql
ALTER TABLE community_clusters DROP COLUMN IF EXISTS member_ids;
ALTER TABLE community_clusters DROP COLUMN IF EXISTS member_count;
```

## Rollback (If Needed)

If something goes wrong, you can restore the old structure:

```sql
-- Add columns back
ALTER TABLE community_clusters ADD COLUMN member_ids UUID[];
ALTER TABLE community_clusters ADD COLUMN member_count INTEGER;

-- Repopulate from junction table
UPDATE community_clusters cc
SET 
  member_ids = ARRAY(
    SELECT user_id FROM cluster_members WHERE cluster_id = cc.cluster_id
  ),
  member_count = (
    SELECT COUNT(*) FROM cluster_members WHERE cluster_id = cc.cluster_id
  );
```

## Benefits You'll Get

✅ **Better Performance** - Indexed lookups instead of array scans  
✅ **Data Integrity** - Foreign key constraints  
✅ **Flexibility** - Easy to add member metadata later  
✅ **Standards** - Follows relational DB best practices  
✅ **Scalability** - No array size limits  

See `CLUSTER_NORMALIZATION_GUIDE.md` for detailed documentation and query examples.





