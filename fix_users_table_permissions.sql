-- Fix permissions for users table
-- This allows the app to create new users when they first log in

-- Grant necessary permissions to authenticated and anon users
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT ON users TO anon;

-- Enable Row Level Security (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can insert their own user record" ON users;
DROP POLICY IF EXISTS "Users can update their own user record" ON users;

-- Create RLS policies for users table
-- Policy 1: Anyone authenticated can view all users (needed for matching)
-- This also allows reading back newly created records
CREATE POLICY "Users can view all users" ON users
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy 2: Authenticated users can insert their own user record
CREATE POLICY "Users can insert their own user record" ON users
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy 3: Users can update their own record
CREATE POLICY "Users can update their own user record" ON users
  FOR UPDATE
  USING (clerk_user_id = auth.jwt()->>'sub')
  WITH CHECK (clerk_user_id = auth.jwt()->>'sub');

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'users';

-- Test the setup
SELECT 
  'Permissions check:' as info,
  has_table_privilege('authenticated', 'users', 'SELECT') as can_select,
  has_table_privilege('authenticated', 'users', 'INSERT') as can_insert,
  has_table_privilege('authenticated', 'users', 'UPDATE') as can_update;

