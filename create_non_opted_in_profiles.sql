-- Create two specific profiles that haven't opted in
-- These will not appear in AI matching results

-- GTM Expert leading sales teams
DO $$
DECLARE
  gtm_user_id UUID;
  frontend_user_id UUID;
BEGIN
  -- Insert GTM Expert user
  INSERT INTO users (clerk_user_id, email, name, created_at, updated_at)
  VALUES (
    'clerk_gtm_expert_' || gen_random_uuid()::text,
    'sarah.martinez@example.com',
    'Sarah Martinez',
    NOW(),
    NOW()
  )
  RETURNING id INTO gtm_user_id;

  -- Insert GTM Expert profile
  INSERT INTO profiles (user_id, name, email, profile_picture, linkedin_url, background, expertise, looking_for, open_to, opted_in, imported_from, created_at, updated_at)
  VALUES (
    gtm_user_id,
    'Sarah Martinez',
    'sarah.martinez@example.com',
    NULL,
    'https://linkedin.com/in/sarahmartinez',
    'Former VP of Sales at two Series B SaaS companies, led teams from 5 to 50+ across enterprise and mid-market segments. Built repeatable GTM motions that drove $50M+ ARR growth. Deep expertise in sales playbooks, pipeline development, and revenue operations. Started my career at Salesforce, then moved into high-growth startups. Currently exploring opportunities to advise early-stage B2B founders on their go-to-market strategies and sales team buildout.',
    'Go-to-market strategy, enterprise sales, sales team building, revenue operations, pipeline development, sales playbooks, customer success alignment, pricing strategy, sales enablement, revenue forecasting, CRM optimization, outbound prospecting, deal negotiation, account-based marketing, sales leadership coaching, compensation design, and scaling sales organizations from seed through Series B.',
    '["Mentorship", "Introductions"]'::jsonb,
    '["Mentoring", "Making introductions", "Providing domain expertise"]'::jsonb,
    false,
    'manual_insert',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created GTM Expert profile with user_id: %', gtm_user_id;

  -- Insert Front-end Expert user
  INSERT INTO users (clerk_user_id, email, name, created_at, updated_at)
  VALUES (
    'clerk_frontend_expert_' || gen_random_uuid()::text,
    'david.chen@example.com',
    'David Chen',
    NOW(),
    NOW()
  )
  RETURNING id INTO frontend_user_id;

  -- Insert Front-end Expert profile
  INSERT INTO profiles (user_id, name, email, profile_picture, linkedin_url, background, expertise, looking_for, open_to, opted_in, imported_from, created_at, updated_at)
  VALUES (
    frontend_user_id,
    'David Chen',
    'david.chen@example.com',
    NULL,
    'https://linkedin.com/in/davidchen',
    'Senior front-end architect with 20+ years building web applications, from the early jQuery days through modern React/Next.js ecosystems. Led front-end teams at Google, Stripe, and two successful startup exits. Deep experience with performance optimization, design systems, accessibility, and mentoring junior developers. I''ve built products used by millions and love solving complex UX challenges. Currently taking a sabbatical but happy to chat with founders about technical architecture decisions.',
    'React, Next.js, TypeScript, JavaScript, HTML/CSS, performance optimization, webpack/Vite configuration, design systems, component libraries, state management (Redux, Zustand, Jotai), CSS-in-JS, Tailwind CSS, responsive design, accessibility (WCAG, ARIA), browser APIs, animation (Framer Motion, GSAP), testing (Jest, React Testing Library, Cypress), CI/CD, code review, technical mentorship, architecture patterns, micro-frontends, and progressive web apps.',
    '["Introductions", "Mentorship"]'::jsonb,
    '["Providing domain expertise", "Mentoring", "Making introductions"]'::jsonb,
    false,
    'manual_insert',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created Front-end Expert profile with user_id: %', frontend_user_id;
END $$;

-- Verify the inserts
SELECT u.name, u.email, p.opted_in, 
       LEFT(p.background, 50) || '...' as background_preview,
       LEFT(p.expertise, 50) || '...' as expertise_preview
FROM users u
JOIN profiles p ON u.id = p.user_id
WHERE u.id IN ('aaaaaaaa-1111-4111-a111-111111111111', 'bbbbbbbb-2222-4222-b222-222222222222');

