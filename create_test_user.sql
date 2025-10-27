-- ============================================================================
-- CREATE TEST USER WITH COMPLETE PROFILE
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Create a test user in the users table
INSERT INTO users (clerk_user_id, email, name)
VALUES (
  'test_user_12345',
  'test@example.com',
  'Test McTesterson'
)
ON CONFLICT (clerk_user_id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name
RETURNING *;

-- Step 2: Create a complete profile for the test user
-- This user will be OPTED IN and appear in AI matching
WITH test_user AS (
  SELECT id FROM users WHERE clerk_user_id = 'test_user_12345'
)
INSERT INTO profiles (
  user_id,
  name,
  email,
  profile_picture,
  linkedin_url,
  background,
  expertise,
  looking_for,
  open_to,
  opted_in,
  imported_from
)
SELECT 
  id,
  'Test McTesterson',
  'test@example.com',
  NULL, -- No profile picture
  'https://linkedin.com/in/testuser',
  'Software engineer with 5 years of experience building SaaS products. Previously worked at a Series B startup where I led the development of a customer analytics platform used by 10,000+ users. Strong background in React, Node.js, and PostgreSQL. Passionate about building tools that help people work more efficiently.',
  'Full-stack development, React, Node.js, TypeScript, PostgreSQL, API design, team leadership, agile methodologies, product thinking, user experience design',
  '["A cofounder", "Domain expertise"]'::jsonb,
  '["Providing domain expertise", "Making introductions", "Mentoring"]'::jsonb,
  true, -- OPTED IN - will appear in AI matching
  'manual_test_data' -- imported_from field
FROM test_user
ON CONFLICT (user_id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    linkedin_url = EXCLUDED.linkedin_url,
    background = EXCLUDED.background,
    expertise = EXCLUDED.expertise,
    looking_for = EXCLUDED.looking_for,
    open_to = EXCLUDED.open_to,
    opted_in = EXCLUDED.opted_in,
    imported_from = EXCLUDED.imported_from,
    updated_at = NOW()
RETURNING *;

-- ============================================================================
-- CREATE ADDITIONAL TEST USERS (Optional)
-- ============================================================================

-- Test User 2: Has profile but NOT opted in (won't appear in matching)
INSERT INTO users (clerk_user_id, email, name)
VALUES ('test_user_67890', 'test2@example.com', 'Jane Designer')
ON CONFLICT (clerk_user_id) DO NOTHING;

WITH test_user2 AS (
  SELECT id FROM users WHERE clerk_user_id = 'test_user_67890'
)
INSERT INTO profiles (
  user_id, name, email, background, expertise, looking_for, open_to, opted_in, imported_from
)
SELECT 
  id,
  'Jane Designer',
  'test2@example.com',
  'Product designer with 7 years experience at tech startups. Led design for mobile apps with 1M+ downloads. Expert in user research, prototyping, and design systems.',
  'UI/UX design, user research, Figma, prototyping, design systems, mobile design, accessibility',
  '["Introductions", "Mentorship"]'::jsonb,
  '["Providing domain expertise", "Making introductions"]'::jsonb,
  false, -- NOT opted in - will NOT appear in matching
  'manual_test_data'
FROM test_user2
ON CONFLICT (user_id) DO NOTHING;

-- Test User 3: Skipped onboarding (minimal profile)
INSERT INTO users (clerk_user_id, email, name)
VALUES ('test_user_skip', 'skip@example.com', 'Skip McSkipper')
ON CONFLICT (clerk_user_id) DO NOTHING;

WITH test_user3 AS (
  SELECT id FROM users WHERE clerk_user_id = 'test_user_skip'
)
INSERT INTO profiles (
  user_id, name, email, background, expertise, looking_for, open_to, opted_in, imported_from
)
SELECT 
  id,
  'Skip McSkipper',
  'skip@example.com',
  'Profile incomplete',
  'Profile incomplete',
  '[]'::jsonb,
  '[]'::jsonb,
  false, -- Skipped - will NOT appear in matching
  'manual_test_data'
FROM test_user3
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- VERIFY TEST USERS
-- ============================================================================

-- Check all test users
SELECT 
  u.clerk_user_id,
  u.name,
  u.email,
  p.opted_in,
  p.imported_from,
  CASE 
    WHEN p.opted_in = true THEN '✅ Appears in matching'
    ELSE '❌ Not in matching'
  END as matching_status
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.clerk_user_id LIKE 'test_%'
ORDER BY u.created_at;

-- ============================================================================
-- ORGANIZATION ASSIGNMENT (If you have an org_id field)
-- ============================================================================

-- If your users or profiles table has an org_id column, uncomment and modify:

-- Option A: Add org_id to users table
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id TEXT;
-- UPDATE users SET org_id = 'nexus-maine' WHERE clerk_user_id LIKE 'test_%';

-- Option B: Add org_id to profiles table
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS org_id TEXT;
-- UPDATE profiles SET org_id = 'nexus-maine' 
-- WHERE user_id IN (SELECT id FROM users WHERE clerk_user_id LIKE 'test_%');

-- ============================================================================
-- CLEANUP (Run this to remove all test users)
-- ============================================================================

-- To delete test users later:
-- DELETE FROM users WHERE clerk_user_id LIKE 'test_%';
-- (Profiles will be deleted automatically due to CASCADE)

-- ============================================================================
-- SUMMARY
-- ============================================================================
/*
Created Test Users:

1. test_user_12345 (Test McTesterson)
   - Complete profile
   - opted_in = true
   - ✅ WILL appear in AI matching

2. test_user_67890 (Jane Designer)
   - Complete profile
   - opted_in = false
   - ❌ Will NOT appear in AI matching

3. test_user_skip (Skip McSkipper)
   - Minimal profile (skipped onboarding)
   - opted_in = false
   - ❌ Will NOT appear in AI matching

To test: Search in chat and only Test McTesterson should appear!
*/

