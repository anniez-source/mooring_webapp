-- ============================================================================
-- COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES
-- This secures all tables to prevent unauthorized data access
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all users in their orgs" ON users;
DROP POLICY IF EXISTS "Users can insert their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;

-- Allow users to view all users (needed for profile matching)
-- Later we can restrict to same-org only if needed
CREATE POLICY "Users can view all users in their orgs" ON users
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT om.user_id
      FROM organization_members om
      WHERE om.org_id IN (
        SELECT org_id 
        FROM organization_members 
        WHERE user_id = (
          SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
        )
      )
    )
  );

-- Allow users to insert their own record (for signup)
CREATE POLICY "Users can insert their own record" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (clerk_user_id = auth.jwt()->>'sub');

-- Allow users to update their own record
CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE
  TO authenticated
  USING (clerk_user_id = auth.jwt()->>'sub');

-- ============================================================================
-- 2. PROFILES TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view profiles in their orgs" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Allow users to view profiles from their organizations
CREATE POLICY "Users can view profiles in their orgs" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT om.user_id
      FROM organization_members om
      WHERE om.org_id IN (
        SELECT org_id 
        FROM organization_members 
        WHERE user_id = (
          SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
        )
      )
    )
  );

-- Allow users to create their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (
      SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (
      SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- ============================================================================
-- 3. ORGANIZATIONS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

-- Allow users to view organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id 
      FROM organization_members 
      WHERE user_id = (
        SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
      )
    )
  );

-- ============================================================================
-- 4. ORGANIZATION_MEMBERS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view members in their orgs" ON organization_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON organization_members;

-- Allow users to view members of their organizations
CREATE POLICY "Users can view members in their orgs" ON organization_members
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id 
      FROM organization_members 
      WHERE user_id = (
        SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
      )
    )
  );

-- Allow system to insert memberships (for triggers)
CREATE POLICY "Users can insert their own membership" ON organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (
      SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- ============================================================================
-- 5. CHAT_SESSIONS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON chat_sessions;

-- Allow users to view only their own chat sessions
CREATE POLICY "Users can view their own sessions" ON chat_sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id = (
      SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- Allow users to create their own chat sessions
CREATE POLICY "Users can insert their own sessions" ON chat_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (
      SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- Allow users to update their own chat sessions
CREATE POLICY "Users can update their own sessions" ON chat_sessions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (
      SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- ============================================================================
-- 6. CHAT_MESSAGES TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to their sessions" ON chat_messages;

-- Allow users to view messages from their own chat sessions
CREATE POLICY "Users can view messages from their sessions" ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    chat_session_id IN (
      SELECT chat_id 
      FROM chat_sessions 
      WHERE user_id = (
        SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
      )
    )
  );

-- Allow users to insert messages to their own sessions
CREATE POLICY "Users can insert messages to their sessions" ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    chat_session_id IN (
      SELECT chat_id 
      FROM chat_sessions 
      WHERE user_id = (
        SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
      )
    )
  );

-- ============================================================================
-- 7. SAVED_CONTACTS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE saved_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own saved contacts" ON saved_contacts;
DROP POLICY IF EXISTS "Users can insert their own saved contacts" ON saved_contacts;
DROP POLICY IF EXISTS "Users can update their own saved contacts" ON saved_contacts;
DROP POLICY IF EXISTS "Users can delete their own saved contacts" ON saved_contacts;

-- Allow users to view only their own saved contacts
CREATE POLICY "Users can view their own saved contacts" ON saved_contacts
  FOR SELECT
  TO authenticated
  USING (
    user_id = (
      SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- Allow users to save contacts
CREATE POLICY "Users can insert their own saved contacts" ON saved_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (
      SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- Allow users to update their own saved contacts (for click tracking)
CREATE POLICY "Users can update their own saved contacts" ON saved_contacts
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (
      SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- Allow users to delete their own saved contacts
CREATE POLICY "Users can delete their own saved contacts" ON saved_contacts
  FOR DELETE
  TO authenticated
  USING (
    user_id = (
      SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
    )
  );

-- ============================================================================
-- 8. COMMUNITY_THEMES TABLE (if exists)
-- ============================================================================

-- Enable RLS (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_themes') THEN
    ALTER TABLE community_themes ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can view themes from their orgs" ON community_themes';
    
    -- Allow users to view themes from their organizations
    -- Note: Double quotes for identifiers, doubled single quotes for string literals in EXECUTE
    EXECUTE $policy$
      CREATE POLICY "Users can view themes from their orgs" ON community_themes
        FOR SELECT
        TO authenticated
        USING (
          org_id IN (
            SELECT org_id 
            FROM organization_members 
            WHERE user_id = (
              SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'
            )
          )
        )
    $policy$;
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check which tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'users', 
  'profiles', 
  'organizations', 
  'organization_members', 
  'chat_sessions', 
  'chat_messages', 
  'saved_contacts',
  'community_themes'
)
ORDER BY tablename;

-- Count policies per table
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Show all policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'RLS enabled successfully on all tables!';
  RAISE NOTICE 'Test by querying tables - you should only see your own data.';
END $$;

