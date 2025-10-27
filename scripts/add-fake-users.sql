-- Add 5 fake users with profiles for testing
-- Run this in Supabase SQL Editor

-- First, let's get or create a default organization
INSERT INTO organizations (org_id, name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Organization'
)
ON CONFLICT (org_id) DO NOTHING;

-- Insert fake users
INSERT INTO users (clerk_user_id, email, name) VALUES
  ('fake_user_1', 'sarah.chen@example.com', 'Sarah Chen'),
  ('fake_user_2', 'mike.johnson@example.com', 'Mike Johnson'),
  ('fake_user_3', 'priya.patel@example.com', 'Priya Patel'),
  ('fake_user_4', 'james.wilson@example.com', 'James Wilson'),
  ('fake_user_5', 'emma.martinez@example.com', 'Emma Martinez')
ON CONFLICT (clerk_user_id) DO NOTHING;

-- Get the user_ids we just created
WITH fake_users AS (
  SELECT user_id, email, name FROM users 
  WHERE clerk_user_id IN ('fake_user_1', 'fake_user_2', 'fake_user_3', 'fake_user_4', 'fake_user_5')
)

-- Insert profiles for each fake user
INSERT INTO profiles (user_id, name, email, ms_program, background, working_on, interests, expertise, looking_for, open_to, opted_in)
SELECT 
  user_id,
  name,
  email,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN 'Computer Science'
    WHEN email = 'mike.johnson@example.com' THEN 'Business Administration'
    WHEN email = 'priya.patel@example.com' THEN 'Data Science'
    WHEN email = 'james.wilson@example.com' THEN 'Engineering'
    WHEN email = 'emma.martinez@example.com' THEN 'Design'
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN 'Sarah has 5 years of experience in full-stack development and recently completed her MS in Computer Science. She specializes in React, Node.js, and cloud architecture.'
    WHEN email = 'mike.johnson@example.com' THEN 'Mike is an entrepreneur who has founded two startups. He has an MBA and extensive experience in growth strategy, fundraising, and team building.'
    WHEN email = 'priya.patel@example.com' THEN 'Priya is a data scientist with expertise in machine learning and AI. She has worked at major tech companies and published research in NLP and computer vision.'
    WHEN email = 'james.wilson@example.com' THEN 'James is a mechanical engineer turned robotics specialist. He has built autonomous systems and has a passion for hardware-software integration.'
    WHEN email = 'emma.martinez@example.com' THEN 'Emma is a product designer with a background in psychology. She specializes in UX research, design systems, and creating accessible interfaces.'
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN 'Building a SaaS platform for developer productivity. Currently implementing AI-powered code review features.'
    WHEN email = 'mike.johnson@example.com' THEN 'Launching a B2B marketplace for sustainable products. In the process of raising a seed round.'
    WHEN email = 'priya.patel@example.com' THEN 'Developing an open-source ML framework for healthcare diagnostics. Collaborating with hospitals on real-world applications.'
    WHEN email = 'james.wilson@example.com' THEN 'Creating low-cost robotics kits for education. Working on making STEM accessible to underserved communities.'
    WHEN email = 'emma.martinez@example.com' THEN 'Redesigning the onboarding experience for a fintech startup. Conducting user research to improve conversion rates.'
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN ARRAY['Web Development', 'Cloud Computing', 'DevOps', 'AI/ML Integration']
    WHEN email = 'mike.johnson@example.com' THEN ARRAY['Entrepreneurship', 'Fundraising', 'Business Strategy', 'Marketing']
    WHEN email = 'priya.patel@example.com' THEN ARRAY['Machine Learning', 'Data Analysis', 'Healthcare Tech', 'Research']
    WHEN email = 'james.wilson@example.com' THEN ARRAY['Robotics', 'Hardware', 'Education', 'Social Impact']
    WHEN email = 'emma.martinez@example.com' THEN ARRAY['UX Design', 'User Research', 'Accessibility', 'Product Strategy']
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN ARRAY['React', 'Node.js', 'Python', 'AWS', 'Docker', 'System Design']
    WHEN email = 'mike.johnson@example.com' THEN ARRAY['Go-to-Market', 'Sales', 'Pitch Decks', 'Financial Modeling', 'Team Management']
    WHEN email = 'priya.patel@example.com' THEN ARRAY['TensorFlow', 'PyTorch', 'SQL', 'NLP', 'Computer Vision', 'Statistics']
    WHEN email = 'james.wilson@example.com' THEN ARRAY['ROS', 'CAD', 'Arduino', 'Raspberry Pi', '3D Printing', 'Control Systems']
    WHEN email = 'emma.martinez@example.com' THEN ARRAY['Figma', 'User Testing', 'Prototyping', 'Design Systems', 'HTML/CSS']
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN ARRAY['Technical co-founder', 'Backend developers', 'DevOps engineers', 'AI/ML experts']
    WHEN email = 'mike.johnson@example.com' THEN ARRAY['Angel investors', 'Marketing partners', 'Technical co-founder', 'Supply chain experts']
    WHEN email = 'priya.patel@example.com' THEN ARRAY['Healthcare professionals', 'Research collaborators', 'Frontend developers', 'Data engineers']
    WHEN email = 'james.wilson@example.com' THEN ARRAY['Educators', 'Hardware engineers', 'Manufacturing partners', 'Grant writers']
    WHEN email = 'emma.martinez@example.com' THEN ARRAY['UX researchers', 'Product managers', 'Frontend developers', 'Accessibility experts']
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN ARRAY['Mentoring junior developers', 'Code reviews', 'Technical advising', 'Speaking at events']
    WHEN email = 'mike.johnson@example.com' THEN ARRAY['Startup mentorship', 'Pitch feedback', 'Investor intros', 'Business strategy']
    WHEN email = 'priya.patel@example.com' THEN ARRAY['Data science mentorship', 'Research collaboration', 'ML model reviews', 'Teaching']
    WHEN email = 'james.wilson@example.com' THEN ARRAY['Hardware consulting', 'Robotics mentorship', 'STEM education', 'Prototyping help']
    WHEN email = 'emma.martinez@example.com' THEN ARRAY['Design critique', 'Portfolio reviews', 'UX consulting', 'Career mentorship']
  END,
  true -- opted_in = true so they show up in searches
FROM fake_users
ON CONFLICT (user_id) DO UPDATE SET
  background = EXCLUDED.background,
  working_on = EXCLUDED.working_on,
  interests = EXCLUDED.interests,
  expertise = EXCLUDED.expertise,
  looking_for = EXCLUDED.looking_for,
  open_to = EXCLUDED.open_to,
  opted_in = EXCLUDED.opted_in;

-- Assign all fake users to the test organization
INSERT INTO organization_members (org_id, user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  user_id,
  'member'
FROM users 
WHERE clerk_user_id IN ('fake_user_1', 'fake_user_2', 'fake_user_3', 'fake_user_4', 'fake_user_5')
ON CONFLICT (org_id, user_id) DO NOTHING;

-- Verify the fake users were created
SELECT 
  p.name,
  p.email,
  p.ms_program,
  p.opted_in,
  om.org_id IS NOT NULL as in_organization
FROM profiles p
LEFT JOIN users u ON p.user_id = u.user_id
LEFT JOIN organization_members om ON u.user_id = om.user_id
WHERE u.clerk_user_id IN ('fake_user_1', 'fake_user_2', 'fake_user_3', 'fake_user_4', 'fake_user_5')
ORDER BY p.name;

