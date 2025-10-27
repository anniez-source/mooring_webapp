-- ============================================================================
-- COMPLETE SCHEMA SETUP FOR MOORING
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CREATE USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- 2. CREATE PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  profile_picture TEXT,
  linkedin_url TEXT,
  background TEXT NOT NULL,
  expertise TEXT NOT NULL,
  looking_for JSONB NOT NULL DEFAULT '[]'::jsonb,
  open_to JSONB NOT NULL DEFAULT '[]'::jsonb,
  opted_in BOOLEAN DEFAULT FALSE,
  imported_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_opted_in ON profiles(opted_in);
CREATE INDEX IF NOT EXISTS idx_profiles_imported_from ON profiles(imported_from);

-- ============================================================================
-- 3. CREATE AUTO-UPDATE TRIGGER FOR updated_at
-- ============================================================================

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. EXAMPLE TEST DATA (Optional - uncomment to use)
-- ============================================================================

-- Insert test user
-- INSERT INTO users (clerk_user_id, email, name) 
-- VALUES ('test_clerk_id_123', 'test@example.com', 'Test User')
-- ON CONFLICT (clerk_user_id) DO NOTHING;

-- Get the user_id for the test profile
-- WITH test_user AS (
--   SELECT id FROM users WHERE clerk_user_id = 'test_clerk_id_123'
-- )
-- INSERT INTO profiles (
--   user_id,
--   name,
--   email,
--   background,
--   expertise,
--   looking_for,
--   open_to,
--   opted_in
-- ) 
-- SELECT 
--   id,
--   'Test User',
--   'test@example.com',
--   'Product manager with 5 years experience building SaaS products. Led teams of 10+ people and shipped features used by thousands of customers. Deep expertise in agile methodologies and user research.',
--   'Product strategy, user research, agile methodologies, team leadership, SaaS products, customer development',
--   '["A cofounder", "Mentorship"]'::jsonb,
--   '["Providing domain expertise", "Making introductions"]'::jsonb,
--   true
-- FROM test_user
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Check users table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check all indexes
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('users', 'profiles')
ORDER BY tablename, indexname;

-- Count records
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM profiles WHERE opted_in = true) as opted_in_profiles;

-- Show sample of joined data
SELECT 
  u.clerk_user_id,
  u.name,
  u.email,
  p.opted_in,
  CASE 
    WHEN p.background IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_profile
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
LIMIT 5;

-- ============================================================================
-- 6. GRANT PERMISSIONS (Adjust based on your Supabase setup)
-- ============================================================================

-- Grant access to authenticated users
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (customize as needed):
-- CREATE POLICY "Users can view own user record" ON users
--   FOR SELECT
--   TO authenticated
--   USING (clerk_user_id = current_setting('request.jwt.claims')::json->>'sub');

-- CREATE POLICY "Users can view own profile" ON profiles
--   FOR SELECT
--   TO authenticated
--   USING (user_id IN (
--     SELECT id FROM users 
--     WHERE clerk_user_id = current_setting('request.jwt.claims')::json->>'sub'
--   ));

-- ============================================================================
-- SCHEMA SUMMARY
-- ============================================================================
-- 
-- USERS TABLE:
--   - Stores authentication and basic user info
--   - Links to Clerk via clerk_user_id
--   - Primary key: id (UUID)
-- 
-- PROFILES TABLE:
--   - Stores detailed profile information
--   - References users via user_id (FK to users.id)
--   - Primary key: user_id (also FK)
--   - Cascade deletes when user is deleted
-- 
-- KEY FEATURES:
--   - Auto-updating updated_at timestamps
--   - JSONB arrays for looking_for and open_to
--   - Indexed for fast queries
--   - Referential integrity maintained
-- 
-- ============================================================================

