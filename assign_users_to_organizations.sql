-- Assign all current users to organizations

-- First, let's see what organizations we have
SELECT org_id, name FROM organizations;

-- Assign ALL current users to "Test Environment" only
INSERT INTO organization_members (user_id, org_id, role, joined_at)
SELECT 
  u.user_id,
  o.org_id,
  'member',
  NOW()
FROM users u
CROSS JOIN organizations o
WHERE o.name = 'Test Environment'
ON CONFLICT (user_id, org_id) DO NOTHING;

-- Verify the assignments
SELECT 
  o.name as organization,
  COUNT(om.user_id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON o.org_id = om.org_id
GROUP BY o.org_id, o.name
ORDER BY o.name;

-- View all assignments with user details
SELECT 
  o.name as organization,
  u.name as user_name,
  u.email as user_email,
  om.role,
  om.joined_at
FROM organization_members om
JOIN organizations o ON om.org_id = o.org_id
JOIN users u ON om.user_id = u.user_id
ORDER BY o.name, u.name;

