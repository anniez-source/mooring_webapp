-- ============================================================================
-- NEW PROFILES TABLE SCHEMA
-- Execute this in Supabase SQL Editor
-- ============================================================================

-- WARNING: This will drop the existing profiles table and all data!
-- Make sure you have a backup if needed
DROP TABLE IF EXISTS profiles CASCADE;

-- Create new profiles table with updated schema
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
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
  
  -- Legacy fields for compatibility (optional, can be removed later)
  ms_program TEXT,
  working_on TEXT,
  interests TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_opted_in ON profiles(opted_in);
CREATE INDEX idx_profiles_clerk_user_id ON profiles(clerk_user_id);
CREATE INDEX idx_profiles_imported_from ON profiles(imported_from);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIELD MAPPINGS (for reference)
-- ============================================================================
-- Old Field Name          → New Field Name
-- ============================================================================
-- can_help_with           → expertise (TEXT)
-- seeking_help_with       → looking_for (JSONB array)
-- available_for           → open_to (JSONB array)
-- completed_at            → opted_in (BOOLEAN) + check for required fields
-- ============================================================================

-- Example data for testing (optional)
-- INSERT INTO profiles (
--   clerk_user_id,
--   name,
--   email,
--   background,
--   expertise,
--   looking_for,
--   open_to,
--   opted_in
-- ) VALUES (
--   'test_clerk_id_123',
--   'Test User',
--   'test@example.com',
--   'Product manager with 5 years experience building SaaS products...',
--   'Product strategy, user research, agile methodologies...',
--   '["A cofounder", "Mentorship"]'::jsonb,
--   '["Providing domain expertise", "Making introductions"]'::jsonb,
--   true
-- );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'profiles';

-- Check row count
SELECT COUNT(*) as total_profiles FROM profiles;

-- ============================================================================
-- GRANT PERMISSIONS (if needed)
-- ============================================================================
-- Adjust based on your Supabase setup
-- GRANT ALL ON profiles TO authenticated;
-- GRANT ALL ON profiles TO service_role;

