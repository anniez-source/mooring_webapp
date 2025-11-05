-- Add user_behavior table (simplified learning approach)
-- This works alongside existing chat_sessions but doesn't require it

CREATE TABLE IF NOT EXISTS user_behavior (
  user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  
  -- Dynamic embedding: rolling average of interaction embeddings
  avg_embedding VECTOR(1536),
  
  -- Recent topics from searches and interactions
  recent_search_terms TEXT[],
  
  -- Engagement metrics
  engagement_score FLOAT DEFAULT 0,
  total_searches INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_profile_views INTEGER DEFAULT 0,
  
  -- Temporal tracking
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_behavior_user_id ON user_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_engagement ON user_behavior(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_behavior_last_interaction ON user_behavior(last_interaction DESC);

-- Enable vector similarity search on behavior embeddings
CREATE INDEX IF NOT EXISTS idx_user_behavior_embedding ON user_behavior 
USING ivfflat (avg_embedding vector_cosine_ops)
WITH (lists = 100);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_behavior_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_behavior_updated_at
  BEFORE UPDATE ON user_behavior
  FOR EACH ROW
  EXECUTE FUNCTION update_user_behavior_updated_at();

-- Add comments
COMMENT ON TABLE user_behavior IS 'Tracks user behavior for adaptive matching - searches, saves, views';
COMMENT ON COLUMN user_behavior.avg_embedding IS 'Rolling average embedding from searches and interactions';
COMMENT ON COLUMN user_behavior.recent_search_terms IS 'Recent search queries to track evolving interests';
COMMENT ON COLUMN user_behavior.engagement_score IS 'Weighted composite: searches (0-30), saves (0-40), views (0-30)';





