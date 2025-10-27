-- Add yourself to the test organization so you can see the fake users
-- Run this AFTER running add-fake-users.sql

-- Replace 'YOUR_CLERK_USER_ID' with your actual Clerk user ID
-- You can find it by running: SELECT clerk_user_id FROM users WHERE email = 'your@email.com';

-- Get your user_id
WITH my_user AS (
  SELECT user_id FROM users WHERE clerk_user_id = 'YOUR_CLERK_USER_ID'  -- Replace this
)

-- Add you to the test organization
INSERT INTO organization_members (org_id, user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',  -- Test org ID
  user_id,
  'admin'  -- Make yourself an admin
FROM my_user
ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'admin';

-- Verify you're in the same org as the fake users
SELECT 
  u.name,
  u.email,
  om.role,
  o.name as org_name
FROM users u
JOIN organization_members om ON u.user_id = om.user_id
JOIN organizations o ON om.org_id = o.id
WHERE om.org_id = '00000000-0000-0000-0000-000000000001'
ORDER BY u.name;

