import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
console.log('Supabase Key:', supabaseAnonKey ? 'Set' : 'Not set');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const dummyProfiles = [
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@example.com',
    ms_program: 'Data Science',
    linkedin_url: 'https://linkedin.com/in/sarahchen',
    background: 'Former data scientist at Google with 5 years of experience in machine learning and AI. Built recommendation systems used by millions of users.',
    working_on: 'Building an AI-powered healthcare platform for personalized treatment recommendations',
    interests: 'Healthcare AI, machine learning, product development',
    can_help_with: 'Data strategy, ML model development, technical architecture',
    seeking_help_with: 'FDA approval process, healthcare regulations, go-to-market strategy',
    available_for: ['mentorship', 'cofounder', 'technical advisory']
  },
  {
    name: 'Marcus Rodriguez',
    email: 'marcus.r@example.com',
    ms_program: 'Computer Science',
    linkedin_url: 'https://linkedin.com/in/marcusrodriguez',
    background: 'Full-stack engineer with 8 years building B2B SaaS products. Led engineering teams at two startups that exited.',
    working_on: 'Launching a developer tools platform for remote teams',
    interests: 'Developer experience, team productivity, open source',
    can_help_with: 'Engineering leadership, technical recruiting, product development',
    seeking_help_with: 'Enterprise sales, fundraising, customer acquisition',
    available_for: ['cofounder', 'technical advisory', 'mentorship']
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    ms_program: 'UX Design',
    linkedin_url: 'https://linkedin.com/in/priyasharma',
    background: 'Product designer with 6 years at companies like Airbnb and Stripe. Specialized in user research and design systems.',
    working_on: 'Creating a design tool for non-designers to build beautiful interfaces',
    interests: 'Design systems, accessibility, inclusive design',
    can_help_with: 'UX research, design strategy, user experience',
    seeking_help_with: 'Technical implementation, business strategy',
    available_for: ['mentorship', 'cofounder', 'design advisory']
  },
  {
    name: 'David Kim',
    email: 'david.kim@example.com',
    ms_program: 'Engineering Management',
    linkedin_url: 'https://linkedin.com/in/davidkim',
    background: 'Former VP of Engineering at Dropbox. 12 years building and scaling engineering organizations from 5 to 500 people.',
    working_on: 'Building an executive coaching platform for engineering leaders',
    interests: 'Leadership development, team culture, scaling organizations',
    can_help_with: 'Engineering management, organizational design, team building',
    seeking_help_with: 'Go-to-market strategy, customer validation',
    available_for: ['mentorship', 'advisory']
  },
  {
    name: 'Emma Thompson',
    email: 'emma.thompson@example.com',
    ms_program: 'Marketing',
    linkedin_url: 'https://linkedin.com/in/emmathompson',
    background: 'Marketing executive with 10 years in B2B tech. Grew HubSpot from $100M to $1B ARR. Expert in product-led growth.',
    working_on: 'Building a SaaS platform for content creators',
    interests: 'Growth marketing, community building, creator economy',
    can_help_with: 'Marketing strategy, growth tactics, content marketing',
    seeking_help_with: 'Product development, technical implementation',
    available_for: ['cofounder', 'mentorship', 'marketing advisory']
  },
  {
    name: 'James Wilson',
    email: 'james.wilson@example.com',
    ms_program: 'Data Science',
    linkedin_url: 'https://linkedin.com/in/jameswilson',
    background: 'PhD in Computer Science from MIT. Research scientist focused on NLP and transformer models. Published 20+ papers.',
    working_on: 'Building an AI platform for scientific research assistance',
    interests: 'Natural language processing, research tools, academic publishing',
    can_help_with: 'AI/ML research, technical architecture, data pipelines',
    seeking_help_with: 'Product strategy, business development',
    available_for: ['cofounder', 'technical advisory']
  },
  {
    name: 'Lisa Anderson',
    email: 'lisa.anderson@example.com',
    ms_program: 'Business Administration',
    linkedin_url: 'https://linkedin.com/in/lisaanderson',
    background: 'Former head of sales at Salesforce. Closed $50M+ in enterprise deals. Expert in complex B2B sales cycles.',
    working_on: 'Building a sales enablement platform for remote teams',
    interests: 'Sales leadership, team training, revenue operations',
    can_help_with: 'Sales strategy, enterprise selling, revenue operations',
    seeking_help_with: 'Product development, technical architecture',
    available_for: ['cofounder', 'mentorship']
  },
  {
    name: 'Michael Chen',
    email: 'michael.chen@example.com',
    ms_program: 'Product Management',
    linkedin_url: 'https://linkedin.com/in/michaelchen',
    background: 'Product manager at Stripe for 5 years. Launched payments products used by thousands of businesses globally.',
    working_on: 'Building a fintech platform for small business banking',
    interests: 'Fintech, payment systems, product strategy',
    can_help_with: 'Product strategy, roadmap planning, fintech compliance',
    seeking_help_with: 'Engineering execution, fundraising',
    available_for: ['cofounder', 'product advisory']
  },
  {
    name: 'Rachel Green',
    email: 'rachel.green@example.com',
    ms_program: 'Computer Science',
    linkedin_url: 'https://linkedin.com/in/rachelgreen',
    background: 'Security engineer with 7 years at companies like GitHub and Cloudflare. Expert in application security and cryptography.',
    working_on: 'Building a developer security platform for modern apps',
    interests: 'Application security, cryptography, developer tools',
    can_help_with: 'Security architecture, compliance, security best practices',
    seeking_help_with: 'Product strategy, growth marketing',
    available_for: ['cofounder', 'technical advisory']
  },
  {
    name: 'Alex Taylor',
    email: 'alex.taylor@example.com',
    ms_program: 'Entrepreneurship',
    linkedin_url: 'https://linkedin.com/in/alextaylor',
    background: 'Founder of 3 startups, 2 successful exits. 15 years building companies from 0 to 50 employees. Strong in operations and fundraising.',
    working_on: 'Building a marketplace for freelance developers',
    interests: 'Startup operations, talent marketplace, gig economy',
    can_help_with: 'Startup operations, fundraising, team building',
    seeking_help_with: 'Product development, marketing',
    available_for: ['mentorship', 'cofounder']
  }
];

async function addDummyData() {
  try {
    console.log('Adding dummy profiles to database...');
    
    const { data, error } = await supabase
      .from('profiles')
      .insert(dummyProfiles);

    if (error) {
      console.error('Error adding profiles:', error);
      return;
    }

    console.log('Successfully added 10 dummy profiles!');
    console.log(data);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addDummyData();

