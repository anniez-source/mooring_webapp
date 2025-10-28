-- Assign all users to the same default organization
-- Run this in Supabase SQL Editor

-- Step 1: Get or create a default organization
INSERT INTO organizations (name, description)
VALUES ('Default Organization', 'Main organization for all users')
ON CONFLICT DO NOTHING
RETURNING id;

-- Step 2: Get the default org ID (if the above returned nothing, use this query)
-- Copy the ID from the result
SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1;

-- Step 3: Assign all users to this organization
-- Replace 'YOUR_ORG_ID_HERE' with the actual org ID from Step 2
INSERT INTO organization_members (org_id, user_id, role)
SELECT 
  'YOUR_ORG_ID_HERE',  -- Replace with actual org ID
  user_id,
  'member'
FROM users
WHERE user_id NOT IN (
  SELECT user_id FROM organization_members WHERE org_id = 'YOUR_ORG_ID_HERE'
);

-- Step 4: Verify all users are in an organization
SELECT 
  u.name,
  u.email,
  om.org_id,
  o.name as org_name
FROM users u
LEFT JOIN organization_members om ON u.user_id = om.user_id
LEFT JOIN organizations o ON om.org_id = o.id
ORDER BY u.name;

