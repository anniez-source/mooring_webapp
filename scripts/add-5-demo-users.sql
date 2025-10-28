-- Add 5 demo users with profiles (no organization setup)
-- Run this in Supabase SQL Editor

-- Insert 5 demo users
INSERT INTO users (clerk_user_id, email, name) VALUES
  ('demo_user_1', 'sarah.chen@example.com', 'Sarah Chen'),
  ('demo_user_2', 'mike.johnson@example.com', 'Mike Johnson'),
  ('demo_user_3', 'priya.patel@example.com', 'Priya Patel'),
  ('demo_user_4', 'james.wilson@example.com', 'James Wilson'),
  ('demo_user_5', 'emma.martinez@example.com', 'Emma Martinez')
ON CONFLICT (clerk_user_id) DO NOTHING;

-- Insert profiles for each demo user
WITH demo_users AS (
  SELECT user_id, email, name FROM users 
  WHERE clerk_user_id IN ('demo_user_1', 'demo_user_2', 'demo_user_3', 'demo_user_4', 'demo_user_5')
)
INSERT INTO profiles (user_id, name, email, background, expertise, looking_for, open_to, opted_in)
SELECT 
  user_id,
  name,
  email,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN 
      'Full-stack developer with 5 years experience in React, Node.js, and cloud architecture. MS in Computer Science. Currently building a SaaS platform for developer productivity with AI-powered code review features.'
    WHEN email = 'mike.johnson@example.com' THEN 
      'Serial entrepreneur with MBA. Founded two startups with successful exits. Expert in growth strategy, fundraising, and team building. Currently launching a B2B marketplace for sustainable products and raising seed funding.'
    WHEN email = 'priya.patel@example.com' THEN 
      'Data scientist specializing in machine learning and AI. Previously at major tech companies. Published research in NLP and computer vision. Currently developing open-source ML framework for healthcare diagnostics.'
    WHEN email = 'james.wilson@example.com' THEN 
      'Mechanical engineer turned robotics specialist. Built autonomous systems for various applications. Passionate about hardware-software integration. Creating low-cost robotics kits for STEM education in underserved communities.'
    WHEN email = 'emma.martinez@example.com' THEN 
      'Product designer with background in psychology. Specializes in UX research, design systems, and accessibility. 8 years experience at startups and enterprises. Currently redesigning fintech onboarding to improve conversion rates.'
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN 
      'React, Node.js, Python, AWS, Docker, Kubernetes, System Design, Cloud Architecture, DevOps, CI/CD, Full-Stack Development, API Design'
    WHEN email = 'mike.johnson@example.com' THEN 
      'Go-to-Market Strategy, Sales, Fundraising, Pitch Decks, Financial Modeling, Team Management, Business Development, Growth Hacking, Product-Market Fit'
    WHEN email = 'priya.patel@example.com' THEN 
      'TensorFlow, PyTorch, Python, SQL, NLP, Computer Vision, Statistics, Deep Learning, Data Science, Healthcare Tech, Research, ETL Pipelines'
    WHEN email = 'james.wilson@example.com' THEN 
      'ROS, CAD, SolidWorks, Arduino, Raspberry Pi, 3D Printing, Control Systems, Robotics, Hardware Engineering, Embedded Systems, Education Technology'
    WHEN email = 'emma.martinez@example.com' THEN 
      'Figma, User Testing, Prototyping, Design Systems, HTML/CSS, JavaScript, UX Research, Accessibility (WCAG), Product Design, Wireframing, User Flows'
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN 
      '["Technical co-founder", "Backend developers", "DevOps engineers", "AI/ML engineers", "Product managers"]'::jsonb
    WHEN email = 'mike.johnson@example.com' THEN 
      '["Angel investors", "VCs", "Marketing partners", "Technical co-founder", "Supply chain experts", "Sales talent"]'::jsonb
    WHEN email = 'priya.patel@example.com' THEN 
      '["Healthcare professionals", "Research collaborators", "Frontend developers", "Data engineers", "ML engineers"]'::jsonb
    WHEN email = 'james.wilson@example.com' THEN 
      '["Educators", "Teachers", "Hardware engineers", "Manufacturing partners", "Grant writers", "Education nonprofits"]'::jsonb
    WHEN email = 'emma.martinez@example.com' THEN 
      '["UX researchers", "Product managers", "Frontend developers", "Accessibility experts", "Design mentors"]'::jsonb
  END,
  CASE 
    WHEN email = 'sarah.chen@example.com' THEN 
      '["Mentoring junior developers", "Code reviews", "Technical advising", "Speaking at events", "Architecture consultation"]'::jsonb
    WHEN email = 'mike.johnson@example.com' THEN 
      '["Startup mentorship", "Pitch feedback", "Investor introductions", "Business strategy sessions", "Growth advice"]'::jsonb
    WHEN email = 'priya.patel@example.com' THEN 
      '["Data science mentorship", "Research collaboration", "ML model reviews", "Teaching workshops", "Career guidance"]'::jsonb
    WHEN email = 'james.wilson@example.com' THEN 
      '["Hardware consulting", "Robotics mentorship", "STEM education workshops", "Prototyping help", "Technical guidance"]'::jsonb
    WHEN email = 'emma.martinez@example.com' THEN 
      '["Design critique", "Portfolio reviews", "UX consulting", "Career mentorship", "Design system help"]'::jsonb
  END,
  true
FROM demo_users
ON CONFLICT (user_id) DO UPDATE SET
  background = EXCLUDED.background,
  expertise = EXCLUDED.expertise,
  looking_for = EXCLUDED.looking_for,
  open_to = EXCLUDED.open_to,
  opted_in = EXCLUDED.opted_in;

-- Verify the demo users were created
SELECT 
  p.name,
  p.email,
  p.opted_in,
  LENGTH(p.background) as background_length,
  LENGTH(p.expertise) as expertise_length
FROM profiles p
JOIN users u ON p.user_id = u.user_id
WHERE u.clerk_user_id IN ('demo_user_1', 'demo_user_2', 'demo_user_3', 'demo_user_4', 'demo_user_5')
ORDER BY p.name;

