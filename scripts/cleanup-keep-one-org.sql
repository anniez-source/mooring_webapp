-- Clean up: Keep only Test Organization membership for all users
-- This removes users from all other orgs and keeps them only in Test Organization

-- Step 1: Delete all memberships EXCEPT Test Organization
DELETE FROM organization_members
WHERE org_id != '00000000-0000-0000-0000-000000000001'::uuid;

-- Step 2: Verify everyone is only in one org now
SELECT 
  u.name,
  u.email,
  COUNT(DISTINCT om.org_id) as org_count,
  o.name as organization
FROM users u
LEFT JOIN organization_members om ON u.user_id = om.user_id
LEFT JOIN organizations o ON om.org_id = o.org_id
GROUP BY u.user_id, u.name, u.email, o.name
ORDER BY u.name;

-- Step 3: Show all current memberships
SELECT 
  u.name,
  u.email,
  o.name as organization,
  om.role
FROM organization_members om
JOIN users u ON om.user_id = u.user_id
JOIN organizations o ON om.org_id = o.org_id
ORDER BY u.name;

