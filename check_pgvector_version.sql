-- Check pgvector version and available index types
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- Check if HNSW is available (pgvector 0.5.0+)
-- This will error if HNSW isn't supported, which tells us the answer



