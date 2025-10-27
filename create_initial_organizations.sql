-- Create initial organizations: Nexus Maine and Test Environment

-- Insert organizations (omitting type field to avoid constraint issues)
INSERT INTO organizations (clerk_org_id, name, location, contact_email, created_at, updated_at)
VALUES 
  -- Nexus Maine (Production)
  (
    'nexus_maine_main',
    'Nexus Maine',
    'Maine, USA',
    'hello@nexusmaine.org',
    NOW(),
    NOW()
  ),
  -- Test Environment (for development/testing)
  (
    'test_environment',
    'Test Environment',
    'Local',
    'test@example.com',
    NOW(),
    NOW()
  )
ON CONFLICT (clerk_org_id) DO NOTHING;

-- Verify organizations were created
SELECT 
  org_id,
  clerk_org_id,
  name,
  type,
  location,
  created_at
FROM organizations
ORDER BY created_at DESC;

-- Optional: To assign existing users to Test Environment, uncomment below:
-- INSERT INTO organization_members (user_id, org_id, role, joined_at)
-- SELECT 
--   u.user_id, 
--   o.org_id, 
--   'member',
--   NOW()
-- FROM users u
-- CROSS JOIN organizations o
-- WHERE o.name = 'Test Environment'
-- ON CONFLICT (user_id, org_id) DO NOTHING;

-- To check organization membership:
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

