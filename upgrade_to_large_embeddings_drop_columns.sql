-- ============================================================================
-- UPGRADE TO text-embedding-3-large (3072 dimensions)
-- DROP AND RECREATE COLUMNS (avoids ivfflat constraint check)
-- ============================================================================

-- Step 1: Drop existing indexes
DROP INDEX IF EXISTS idx_profiles_embedding;
DROP INDEX IF EXISTS idx_user_behavior_embedding;

-- Step 2: Drop the embedding columns entirely
-- (This avoids the ivfflat dimension check)
ALTER TABLE profiles DROP COLUMN IF EXISTS embedding;
ALTER TABLE user_behavior DROP COLUMN IF EXISTS avg_embedding;

-- Step 3: Recreate columns with 3072 dimensions
ALTER TABLE profiles ADD COLUMN embedding VECTOR(3072);
ALTER TABLE user_behavior ADD COLUMN avg_embedding VECTOR(3072);

-- Step 4: Try to create HNSW indexes (comment out if not supported)
-- If this fails, just skip it - no index is fine for 300 profiles!
CREATE INDEX IF NOT EXISTS idx_profiles_embedding ON profiles 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_user_behavior_embedding ON user_behavior 
USING hnsw (avg_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Step 5: Verify
SELECT 
  table_name, 
  column_name,
  udt_name
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'user_behavior') 
  AND column_name LIKE '%embedding%'
ORDER BY table_name, column_name;

DO $$
BEGIN
  RAISE NOTICE '✅ Columns recreated with 3072 dimensions!';
  RAISE NOTICE '🚀 Next: node scripts/regenerate-embeddings-large.js';
END $$;



