-- Check which users are in multiple organizations

-- See all org memberships
SELECT 
  u.name,
  u.email,
  o.name as org_name,
  om.role,
  om.joined_at
FROM organization_members om
JOIN users u ON om.user_id = u.user_id
JOIN organizations o ON om.org_id = o.org_id
ORDER BY u.name, o.name;

-- Find users in multiple orgs
SELECT 
  u.name,
  u.email,
  COUNT(DISTINCT om.org_id) as org_count,
  STRING_AGG(o.name, ', ') as organizations
FROM organization_members om
JOIN users u ON om.user_id = u.user_id
JOIN organizations o ON om.org_id = o.org_id
GROUP BY u.user_id, u.name, u.email
HAVING COUNT(DISTINCT om.org_id) > 1
ORDER BY u.name;

