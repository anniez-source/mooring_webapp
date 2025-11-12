/**
 * Generate 80 realistic, varied profiles using GPT-4
 * Avoids templated responses and creates diverse, natural profiles
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Get the default organization
async function getDefaultOrg() {
  const { data, error } = await supabase
    .from('organizations')
    .select('org_id')
    .limit(1)
    .single();
  
  if (error || !data) {
    throw new Error('No organization found. Please create one first.');
  }
  
  return data.org_id;
}

// Generate a batch of profiles using GPT-4
async function generateProfileBatch(batchNumber, batchSize, retryCount = 0) {
  console.log(`\n🤖 Generating batch ${batchNumber} (${batchSize} profiles)${retryCount > 0 ? ` - Retry ${retryCount}` : ''}...`);
  
  const prompt = `Generate ${batchSize} realistic professional profiles for people in innovation/tech communities. 

CRITICAL REQUIREMENTS:
- Make each profile UNIQUE with varied writing styles (some formal, some casual, some brief, some detailed)
- AVOID templated language like "currently working at [company] on [thing]"
- Use NATURAL, CONVERSATIONAL language that real people would write
- Mix career stages: founders, employees, consultants, researchers, career changers, retirees re-entering, freelancers
- Diverse domains: rural healthcare, ocean tech, climate, agriculture, education, manufacturing, finance, logistics, robotics, etc.
- Some should be technical, some non-technical, some hybrid
- Vary the depth: some write a lot, some keep it minimal
- Include people from different locations (Portland, Seattle, Austin, Boston, rural areas, international)
- Mix of genders and ethnicities in names

For each person, provide:
1. name: Full name (varied ethnicity, gender)
2. email: realistic email (firstname.lastname@domain.com)
3. background: Their professional background (2-4 sentences, VARIED style - some verbose, some terse)
4. expertise: What they're good at (1-3 sentences, natural language)
5. interests: What problems they care about (1-3 sentences)
6. how_i_help: Array of 1-3 from: ["advising", "coffee_chats", "feedback", "introductions", "cofounding", "not_available"]
7. linkedin_url: realistic LinkedIn URL (https://linkedin.com/in/firstname-lastname)

STYLE EXAMPLES TO VARY:
- Technical precise: "Spent 8 years in distributed systems at scale. Know Kubernetes inside out."
- Casual storyteller: "I kind of fell into ocean tech by accident - was building sensors for farms and realized the same tech works underwater."
- Minimal: "Climate data. Previously finance."
- Academic: "My research focuses on the intersection of behavioral economics and climate action."
- Career changer: "Was a teacher for 15 years. Now building edtech because I got frustrated."
- Founder: "Third startup. First two failed. This one's in ag-tech. We're making it work."

Return ONLY a valid JSON array with ${batchSize} profiles. No markdown blocks, no explanation, just the raw JSON array.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{
        role: "system",
        content: "You are a helpful assistant that generates realistic, varied professional profiles in valid JSON format. Always return pure JSON without markdown formatting."
      }, {
        role: "user",
        content: prompt
      }],
      temperature: 0.9,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    
    // Parse the JSON response
    const parsed = JSON.parse(content);
    
    // GPT might wrap it in an object with "profiles" key
    const profiles = parsed.profiles || parsed;
    
    if (!Array.isArray(profiles) || profiles.length === 0) {
      throw new Error('Invalid profiles array from GPT-4');
    }
    
    return profiles;
    
  } catch (error) {
    if (retryCount < 2) {
      console.log(`  ⚠️  Batch failed, retrying... (${error.message})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return generateProfileBatch(batchNumber, batchSize, retryCount + 1);
    }
    throw error;
  }
}

// Generate embedding for profile text
async function generateEmbedding(text) {
  // Clean the text
  const cleanWords = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);
  
  const cleanedText = cleanWords.join(' ');
  
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: cleanedText
  });
  
  return response.data[0].embedding;
}

// Build profile text for embedding
function buildProfileText(profile) {
  return `
    Background: ${profile.background || ''}
    Expertise: ${profile.expertise || ''}
    Interests: ${profile.interests || ''}
  `.trim();
}

async function insertProfile(profile, orgId) {
  try {
    // Generate user_id
    const userId = crypto.randomUUID();
    const clerkUserId = `fake_${crypto.randomBytes(16).toString('hex')}`;

    // Insert user
    const { error: userError } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        clerk_user_id: clerkUserId,
        email: profile.email,
        created_at: new Date().toISOString()
      });

    if (userError) throw userError;

    // Generate embedding
    const profileText = buildProfileText(profile);
    const embedding = await generateEmbedding(profileText);

    // Insert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        name: profile.name,
        email: profile.email,
        background: profile.background,
        expertise: profile.expertise,
        interests: profile.interests,
        how_i_help: profile.how_i_help || ['not_available'],
        linkedin_url: profile.linkedin_url,
        opted_in: true,
        embedding: embedding,
        created_at: new Date().toISOString()
      });

    if (profileError) throw profileError;

    // Add to organization
    const { error: orgError } = await supabase
      .from('organization_members')
      .insert({
        org_id: orgId,
        user_id: userId,
        joined_at: new Date().toISOString()
      });

    if (orgError) throw orgError;

    return userId;
  } catch (error) {
    console.error(`  ❌ Error inserting ${profile.name}:`, error.message);
    throw error;
  }
}

async function generateProfiles() {
  console.log('🚀 Generating 80 realistic, varied profiles with GPT-4...\n');

  const orgId = await getDefaultOrg();
  console.log(`✓ Using organization: ${orgId}\n`);

  // Check current profile count
  const { count: currentCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  console.log(`✓ Current profiles: ${currentCount}`);
  console.log(`✓ Will add: 80 new profiles\n`);

  const totalProfiles = 80;
  const batchSize = 10;
  const batches = Math.ceil(totalProfiles / batchSize);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < batches; i++) {
    const currentBatchSize = Math.min(batchSize, totalProfiles - (i * batchSize));
    
    try {
      // Generate batch with GPT-4
      const profiles = await generateProfileBatch(i + 1, currentBatchSize);
      
      // Insert each profile
      for (const profile of profiles) {
        try {
          await insertProfile(profile, orgId);
          successCount++;
          console.log(`  ✓ ${profile.name} (${successCount}/${totalProfiles})`);
        } catch (err) {
          errorCount++;
          console.error(`  ❌ Failed: ${profile.name}`);
        }
      }

      // Rate limiting - wait between batches
      if (i < batches - 1) {
        console.log('  ⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (err) {
      console.error(`❌ Error generating batch ${i + 1}:`, err.message);
      errorCount += currentBatchSize;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Profile generation complete!');
  console.log(`   ✓ Success: ${successCount}`);
  console.log(`   ✗ Errors: ${errorCount}`);
  console.log(`   Total attempted: ${totalProfiles}`);
  console.log('='.repeat(60));
  
  // Get final count
  const { count: finalCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total profiles in database: ${finalCount}`);
  console.log('\n💡 Next step: Re-run clustering');
  console.log('   npm run cluster\n');
}

generateProfiles()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

