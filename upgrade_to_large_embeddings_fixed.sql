-- ============================================================================
-- UPGRADE TO text-embedding-3-large (3072 dimensions) - FIXED VERSION
-- ============================================================================
-- This handles existing 1536-dim embeddings properly
-- ============================================================================

-- Step 1: Drop existing indexes
DROP INDEX IF EXISTS idx_profiles_embedding;
DROP INDEX IF EXISTS idx_user_behavior_embedding;

-- Step 2: Clear existing embeddings (they're 1536-dim, we need 3072-dim)
-- Don't worry - we'll regenerate them in the next step!
UPDATE profiles SET embedding = NULL;
UPDATE user_behavior SET avg_embedding = NULL;

-- Step 3: Now we can safely alter the column types
ALTER TABLE profiles ALTER COLUMN embedding TYPE VECTOR(3072);
ALTER TABLE user_behavior ALTER COLUMN avg_embedding TYPE VECTOR(3072);

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_profiles_embedding ON profiles 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_user_behavior_embedding ON user_behavior 
USING ivfflat (avg_embedding vector_cosine_ops) WITH (lists = 100);

-- Step 5: Verify the changes
SELECT 
  table_name, 
  column_name,
  udt_name
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'user_behavior') 
  AND column_name LIKE '%embedding%'
ORDER BY table_name, column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database upgraded to 3072 dimensions!';
  RAISE NOTICE '📝 All old embeddings cleared (they were 1536-dim)';
  RAISE NOTICE '🚀 Next: Run node scripts/regenerate-embeddings-large.js';
END $$;



