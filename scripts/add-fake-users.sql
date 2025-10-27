-- Add 5 fake users with profiles for testing
-- Run this in Supabase SQL Editor

-- First, let's get or create a default organization
INSERT INTO organizations (org_id, name, type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Organization',
  'community'
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
INSERT INTO profiles (user_id, name, email, background, expertise, looking_for, open_to, opted_in)
SELECT 
  user_id,
  name,
  email,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN 'Sarah has 5 years of experience in full-stack development and recently completed her MS in Computer Science. She specializes in React, Node.js, and cloud architecture. Currently building a SaaS platform for developer productivity with AI-powered code review features.'
    WHEN email = 'mike.johnson@example.com' THEN 'Mike is an entrepreneur who has founded two startups. He has an MBA and extensive experience in growth strategy, fundraising, and team building. Currently launching a B2B marketplace for sustainable products and raising a seed round.'
    WHEN email = 'priya.patel@example.com' THEN 'Priya is a data scientist with expertise in machine learning and AI. She has worked at major tech companies and published research in NLP and computer vision. Currently developing an open-source ML framework for healthcare diagnostics.'
    WHEN email = 'james.wilson@example.com' THEN 'James is a mechanical engineer turned robotics specialist. He has built autonomous systems and has a passion for hardware-software integration. Currently creating low-cost robotics kits to make STEM education accessible to underserved communities.'
    WHEN email = 'emma.martinez@example.com' THEN 'Emma is a product designer with a background in psychology. She specializes in UX research, design systems, and creating accessible interfaces. Currently redesigning the onboarding experience for a fintech startup to improve conversion rates.'
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN 'React, Node.js, Python, AWS, Docker, System Design, Cloud Architecture, DevOps, Full-Stack Development'
    WHEN email = 'mike.johnson@example.com' THEN 'Go-to-Market Strategy, Sales, Pitch Decks, Financial Modeling, Team Management, Fundraising, Business Development'
    WHEN email = 'priya.patel@example.com' THEN 'TensorFlow, PyTorch, SQL, NLP, Computer Vision, Statistics, Machine Learning, Data Science, Healthcare Tech'
    WHEN email = 'james.wilson@example.com' THEN 'ROS, CAD, Arduino, Raspberry Pi, 3D Printing, Control Systems, Robotics, Hardware Engineering, Education'
    WHEN email = 'emma.martinez@example.com' THEN 'Figma, User Testing, Prototyping, Design Systems, HTML/CSS, UX Research, Accessibility, Product Design'
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN '["Technical co-founder", "Backend developers", "DevOps engineers", "AI/ML experts"]'::jsonb
    WHEN email = 'mike.johnson@example.com' THEN '["Angel investors", "Marketing partners", "Technical co-founder", "Supply chain experts"]'::jsonb
    WHEN email = 'priya.patel@example.com' THEN '["Healthcare professionals", "Research collaborators", "Frontend developers", "Data engineers"]'::jsonb
    WHEN email = 'james.wilson@example.com' THEN '["Educators", "Hardware engineers", "Manufacturing partners", "Grant writers"]'::jsonb
    WHEN email = 'emma.martinez@example.com' THEN '["UX researchers", "Product managers", "Frontend developers", "Accessibility experts"]'::jsonb
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN '["Mentoring junior developers", "Code reviews", "Technical advising", "Speaking at events"]'::jsonb
    WHEN email = 'mike.johnson@example.com' THEN '["Startup mentorship", "Pitch feedback", "Investor intros", "Business strategy"]'::jsonb
    WHEN email = 'priya.patel@example.com' THEN '["Data science mentorship", "Research collaboration", "ML model reviews", "Teaching"]'::jsonb
    WHEN email = 'james.wilson@example.com' THEN '["Hardware consulting", "Robotics mentorship", "STEM education", "Prototyping help"]'::jsonb
    WHEN email = 'emma.martinez@example.com' THEN '["Design critique", "Portfolio reviews", "UX consulting", "Career mentorship"]'::jsonb
  END,
  true -- opted_in = true so they show up in searches
FROM fake_users
ON CONFLICT (user_id) DO UPDATE SET
  background = EXCLUDED.background,
  expertise = EXCLUDED.expertise,
  looking_for = EXCLUDED.looking_for,
  open_to = EXCLUDED.open_to,
  opted_in = EXCLUDED.opted_in;

-- Assign all fake users to the test organization  
INSERT INTO organization_members (org_id, user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  user_id,
  'member'::text
FROM users 
WHERE clerk_user_id IN ('fake_user_1', 'fake_user_2', 'fake_user_3', 'fake_user_4', 'fake_user_5')
ON CONFLICT (user_id, org_id) DO NOTHING;

-- Verify the fake users were created
SELECT 
  p.name,
  p.email,
  p.opted_in,
  om.org_id IS NOT NULL as in_organization,
  o.name as org_name
FROM profiles p
LEFT JOIN users u ON p.user_id = u.user_id
LEFT JOIN organization_members om ON u.user_id = om.user_id
LEFT JOIN organizations o ON om.org_id = o.org_id
WHERE u.clerk_user_id IN ('fake_user_1', 'fake_user_2', 'fake_user_3', 'fake_user_4', 'fake_user_5')
ORDER BY p.name;

