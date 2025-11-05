-- ============================================================================
-- UPGRADE TO text-embedding-3-large (3072 dimensions)
-- NO INDEX VERSION (if HNSW not available)
-- ============================================================================
-- For 300 profiles, brute-force search is fast enough!
-- Queries will still work, just slightly slower (but imperceptible)
-- ============================================================================

-- Step 1: Drop existing indexes
DROP INDEX IF EXISTS idx_profiles_embedding;
DROP INDEX IF EXISTS idx_user_behavior_embedding;

-- Step 2: Clear existing embeddings (they're 1536-dim, we need 3072-dim)
UPDATE profiles SET embedding = NULL;
UPDATE user_behavior SET avg_embedding = NULL;

-- Step 3: Change column types to 3072 dimensions
ALTER TABLE profiles ALTER COLUMN embedding TYPE VECTOR(3072);
ALTER TABLE user_behavior ALTER COLUMN avg_embedding TYPE VECTOR(3072);

-- Step 4: NO INDEXES (brute force is fine for small datasets)
-- With 300 profiles, searches take ~10-20ms without index
-- This is perfectly acceptable!

-- Step 5: Verify
SELECT 
  table_name, 
  column_name,
  udt_name
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'user_behavior') 
  AND column_name LIKE '%embedding%'
ORDER BY table_name, column_name;

-- Success!
DO $$
BEGIN
  RAISE NOTICE '✅ Upgraded to 3072 dimensions!';
  RAISE NOTICE '📝 No index created (brute force is fast enough for 300 profiles)';
  RAISE NOTICE '🚀 Next: node scripts/regenerate-embeddings-large.js';
END $$;



