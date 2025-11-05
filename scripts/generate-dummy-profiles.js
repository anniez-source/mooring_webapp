import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const HELP_TYPES = [
  ['advising', 'coffee_chats'],
  ['coffee_chats', 'feedback'],
  ['advising', 'introductions'],
  ['feedback', 'introductions'],
  ['coffee_chats'],
  ['advising'],
  ['feedback'],
  ['introductions'],
  ['not_available']
];

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function generateRandomProfile() {
  const prompt = `Generate a realistic professional profile for someone in the Maine tech ecosystem - Nexus Maine, startups, accelerators, innovation hubs, tech companies.

CRITICAL: Write in THIRD PERSON without using any names. Start sentences with "Working on...", "Building...", "Former...", "Currently..." - NEVER start with a person's name.

Realistic Maine tech profiles:
- Software engineer at a Portland SaaS company, previously at a Boston fintech startup
- Climate tech founder building ocean monitoring systems, Maine Maritime Academy background
- AI/ML engineer working on healthcare diagnostics, moved to Maine during COVID
- Former consultant now running a bootstrapped marketplace for Maine fishermen
- Product manager at a remote-first startup, focused on rural broadband solutions
- Data scientist working on forestry management and carbon sequestration models
- Developer building tools for small-scale aquaculture farms in Downeast Maine
- Health tech founder creating telemedicine platforms for rural communities
- Designer working on civic tech projects with Maine municipalities
- Full-stack engineer at a climate tech accelerator, mentoring founders

Be SPECIFIC. Use concrete details. Make it feel like a real Maine tech person.

Return JSON with:
{
  "background": "2-3 sentences about career path and current work. NO NAMES. Start with 'Working on...', 'Building...', 'Former...', etc. Be specific.",
  "expertise": "Comma-separated specific skills and knowledge areas. Mix technical and domain expertise.",
  "interests": "1-2 sentences about what problems or questions obsess them. Make it personal and specific."
}

Make this person feel real. Focus on Maine tech ecosystem (climate, health, AI/ML, SaaS, local impact).`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.9
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error generating profile:', error);
    throw error;
  }
}

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return response.data[0].embedding;
}

function generateNames(count) {
  const firstNames = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
    'Jamie', 'Skylar', 'Rowan', 'Sage', 'River', 'Phoenix', 'Dakota', 'Emerson',
    'Parker', 'Kendall', 'Cameron', 'Reese', 'Drew', 'Blake', 'Devon', 'Charlie',
    'Sam', 'Robin', 'Ash', 'Jules', 'Frankie', 'Lou', 'Max', 'Bay',
    'Kai', 'Lane', 'Peyton', 'Finley', 'Hayden', 'Marley', 'Remy', 'Sawyer',
    'Ellis', 'Micah', 'Aspen', 'Cedar', 'Scout', 'Wren', 'Arlo', 'Indigo',
    'Marlowe', 'Bellamy', 'Sutton', 'Holland', 'Lennox', 'Zion', 'Rain', 'Winter'
  ];
  
  const lastNames = [
    'Chen', 'Patel', 'Kim', 'Garcia', 'Martinez', 'Singh', 'Kumar', 'Lee',
    'Rodriguez', 'Nguyen', 'Cohen', 'Okafor', 'Silva', 'Ahmed', 'Ali',
    'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson',
    'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'White',
    'Thompson', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall',
    'Allen', 'Young', 'King', 'Wright', 'Lopez', 'Hill', 'Green', 'Adams',
    'Baker', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner',
    'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart'
  ];
  
  const names = [];
  while (names.length < count) {
    const name = `${randomFrom(firstNames)} ${randomFrom(lastNames)}`;
    if (!names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

async function generateDummyProfiles(count = 200) {
  console.log(`Generating ${count} AI-generated dummy profiles...\n`);
  console.log('This will take a while due to API rate limits...\n');
  
  // Get the default org
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('org_id')
    .eq('name', 'Default Community')
    .single();
  
  if (orgError || !org) {
    console.error('Default Community not found. Run setup-default-org.js first.');
    return;
  }
  
  const profiles = [];
  const names = generateNames(count);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < count; i++) {
    const name = names[i];
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`;
    
    try {
      // Generate random profile from GPT
      const profile = await generateRandomProfile();
      
      const how_i_help = randomFrom(HELP_TYPES);
      
      // Generate embedding
      const profileText = `${profile.background} ${profile.expertise} ${profile.interests}`;
      const embedding = await generateEmbedding(profileText);
      
      profiles.push({
        name,
        email,
        profile_picture: null,
        linkedin_url: Math.random() > 0.3 ? `https://linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}` : null,
        background: profile.background,
        expertise: profile.expertise,
        interests: profile.interests,
        how_i_help,
        opted_in: true,
        embedding
      });
      
      successCount++;
      console.log(`✓ ${successCount}/${count}: ${name}`);
      
      // Rate limit - OpenAI has limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      errorCount++;
      console.error(`✗ Error generating profile for ${name}:`, error.message);
      continue;
    }
  }
  
  console.log(`\nGenerated ${successCount} profiles (${errorCount} errors)`);
  
  if (profiles.length === 0) {
    console.log('No profiles to insert.');
    return;
  }
  
  // Create users AND profiles
  console.log('\nCreating users and profiles in database...');
  let totalInserted = 0;
  
  for (let i = 0; i < profiles.length; i++) {
    const profileData = profiles[i];
    
    try {
      // Step 1: Create user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          name: profileData.name,
          email: profileData.email
        })
        .select('user_id')
        .single();
      
      if (userError || !userData) {
        console.error(`Error creating user ${profileData.name}:`, userError);
        continue;
      }
      
      // Step 2: Create profile with user_id
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userData.user_id,
          name: profileData.name,
          email: profileData.email,
          profile_picture: profileData.profile_picture,
          linkedin_url: profileData.linkedin_url,
          background: profileData.background,
          expertise: profileData.expertise,
          interests: profileData.interests,
          how_i_help: profileData.how_i_help,
          opted_in: profileData.opted_in,
          embedding: profileData.embedding
        });
      
      if (profileError) {
        console.error(`Error creating profile for ${profileData.name}:`, profileError);
        continue;
      }
      
      // Step 3: Add to organization
      const { error: orgError } = await supabase
        .from('organization_members')
        .insert({
          org_id: org.org_id,
          user_id: userData.user_id,
          role: 'member'
        });
      
      if (orgError) {
        console.error(`Error adding ${profileData.name} to org:`, orgError);
      }
      
      totalInserted++;
      if (totalInserted % 10 === 0) {
        console.log(`Created ${totalInserted}/${profiles.length} users...`);
      }
      
    } catch (err) {
      console.error(`Error processing ${profileData.name}:`, err.message);
      continue;
    }
  }
  
  console.log(`\n✅ Successfully created ${totalInserted} dummy users and profiles!`);
  console.log('\nTo clean up later, run:');
  console.log(`DELETE FROM users WHERE email LIKE '%@example.com';`);
  console.log(`DELETE FROM profiles WHERE email LIKE '%@example.com';`);
}

// Run it
const count = parseInt(process.argv[2]) || 200;

console.log('Configuration:');
console.log(`- Count: ${count}`);
console.log(`- Estimated time: ~${Math.ceil(count / 60)} minutes\n`);

generateDummyProfiles(count)
  .then(() => {
    console.log('\n✨ Done! Run: npm run detect-clusters');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

