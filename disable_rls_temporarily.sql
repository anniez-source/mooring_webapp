-- ============================================================================
-- DISABLE ROW LEVEL SECURITY (TEMPORARY - FOR DEVELOPMENT ONLY)
-- WARNING: This removes all security - do NOT use in production!
-- ============================================================================

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_contacts DISABLE ROW LEVEL SECURITY;

-- Disable on community_themes if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'community_themes') THEN
    ALTER TABLE community_themes DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Verify RLS is disabled
SELECT 
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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '⚠️  RLS DISABLED - All tables are now accessible without restrictions';
  RAISE NOTICE 'This is OK for development, but ENABLE RLS before production!';
END $$;


