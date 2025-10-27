-- ============================================================================
-- DEBUG TEST USER CREATION
-- Run each section separately to see where it fails
-- ============================================================================

-- STEP 1: Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('users', 'profiles');
-- Expected: Should show both 'users' and 'profiles'

-- STEP 2: Check users table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
-- Check what columns exist

-- STEP 3: Check profiles table structure  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
-- Check what columns exist

-- STEP 4: Try to insert a simple user (run this separately)
INSERT INTO users (clerk_user_id, email, name)
VALUES ('test_simple_123', 'testsimple@example.com', 'Simple Test')
RETURNING *;
-- If this fails, copy the error message

-- STEP 5: Get the user_id we just created
SELECT id, clerk_user_id, name, email FROM users WHERE clerk_user_id = 'test_simple_123';
-- Copy the 'id' value

-- STEP 6: Insert profile (REPLACE 'YOUR-UUID-HERE' with the id from step 5)
INSERT INTO profiles (
  user_id,
  name, 
  email,
  background,
  expertise,
  looking_for,
  open_to,
  opted_in
) VALUES (
  'YOUR-UUID-HERE'::uuid, -- REPLACE THIS with the actual UUID from step 5
  'Simple Test',
  'testsimple@example.com',
  'This is a test background with more than 150 characters to meet the requirement. I am a software engineer with experience in web development. I have worked on various projects using React, Node.js, and PostgreSQL.',
  'Software development, web technologies, React, Node.js, PostgreSQL, API development, testing, debugging, and problem solving skills.',
  '["A cofounder", "Domain expertise"]'::jsonb,
  '["Providing domain expertise"]'::jsonb,
  true
) RETURNING *;
-- If this fails, copy the error message

-- ============================================================================
-- CLEANUP TEST DATA (if needed)
-- ============================================================================
-- DELETE FROM users WHERE clerk_user_id = 'test_simple_123';

