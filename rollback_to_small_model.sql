-- ============================================================================
-- ROLLBACK TO text-embedding-3-small (1536 dimensions)
-- But KEEP the enhanced fields in the profile text!
-- ============================================================================

-- Drop the 3072-dim columns
ALTER TABLE profiles DROP COLUMN IF EXISTS embedding;
ALTER TABLE user_behavior DROP COLUMN IF EXISTS avg_embedding;

-- Recreate with 1536 dimensions
ALTER TABLE profiles ADD COLUMN embedding VECTOR(1536);
ALTER TABLE user_behavior ADD COLUMN avg_embedding VECTOR(1536);

-- Create ivfflat indexes (works fine with 1536 dimensions)
CREATE INDEX IF NOT EXISTS idx_profiles_embedding ON profiles 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_user_behavior_embedding ON user_behavior 
USING ivfflat (avg_embedding vector_cosine_ops)
WITH (lists = 100);

-- Verify
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
  RAISE NOTICE '✅ Rolled back to 1536 dimensions!';
  RAISE NOTICE '🚀 Next: node scripts/regenerate-embeddings-enhanced.js';
END $$;



