-- ============================================================================
-- UPGRADE TO text-embedding-3-large (3072 dimensions)
-- Using HNSW index (supports >2000 dimensions)
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

-- Step 4: Create HNSW indexes (supports more dimensions than ivfflat)
-- HNSW is available in pgvector 0.5.0+
-- If this fails, see the no-index version below

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

-- Success!
DO $$
BEGIN
  RAISE NOTICE '✅ Upgraded to 3072 dimensions with HNSW index!';
  RAISE NOTICE '🚀 Next: node scripts/regenerate-embeddings-large.js';
END $$;



