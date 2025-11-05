-- ============================================================================
-- UPGRADE TO text-embedding-3-large (3072 dimensions)
-- ============================================================================
-- This migration upgrades from 1536-dim to 3072-dim embeddings
-- Run this in Supabase SQL Editor BEFORE regenerating embeddings
-- ============================================================================

-- Step 1: Drop existing indexes on embeddings (they reference the old dimension)
DROP INDEX IF EXISTS idx_profiles_embedding;
DROP INDEX IF EXISTS idx_user_behavior_embedding;

-- Step 2: Alter profiles.embedding column to support 3072 dimensions
ALTER TABLE profiles 
ALTER COLUMN embedding TYPE VECTOR(3072);

-- Step 3: Alter user_behavior.avg_embedding column to support 3072 dimensions
ALTER TABLE user_behavior 
ALTER COLUMN avg_embedding TYPE VECTOR(3072);

-- Step 4: Recreate indexes with new dimensions
CREATE INDEX IF NOT EXISTS idx_profiles_embedding ON profiles 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_user_behavior_embedding ON user_behavior 
USING ivfflat (avg_embedding vector_cosine_ops)
WITH (lists = 100);

-- Verify the changes
SELECT 
  table_name, 
  column_name, 
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name IN ('profiles', 'user_behavior') 
  AND column_name LIKE '%embedding%'
ORDER BY table_name, column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database upgraded to support 3072-dimension embeddings!';
  RAISE NOTICE 'Next: Run node scripts/regenerate-embeddings-large.js';
END $$;



