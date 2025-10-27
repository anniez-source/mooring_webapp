-- Automatically assign new users to Test Environment organization

-- Create function to auto-assign users to Test Environment
CREATE OR REPLACE FUNCTION auto_assign_to_test_environment()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into organization_members for Test Environment
  INSERT INTO organization_members (user_id, org_id, role, joined_at)
  SELECT 
    NEW.user_id,
    o.org_id,
    'member',
    NOW()
  FROM organizations o
  WHERE o.name = 'Test Environment'
  ON CONFLICT (user_id, org_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after new user is inserted
CREATE TRIGGER trigger_auto_assign_test_environment
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_to_test_environment();

-- Verify trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_assign_test_environment';

-- Test by viewing what happens when you create a new user
-- All new users will automatically join Test Environment!

