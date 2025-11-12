/**
 * Generate 100 realistic, varied profiles using Claude API
 * Avoids templated responses and creates diverse, natural profiles
 */

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

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

// Generate a batch of profiles using Claude
async function generateProfileBatch(batchNumber, batchSize, retryCount = 0) {
  console.log(`\n🤖 Generating batch ${batchNumber} (${batchSize} profiles)${retryCount > 0 ? ` - Retry ${retryCount}` : ''}...`);
  
  const prompt = `Generate ${batchSize} realistic professional profiles for people in innovation/tech communities. 

CRITICAL REQUIREMENTS:
- Make each profile UNIQUE with varied writing styles (some formal, some casual, some brief, some detailed)
- AVOID templated language like "currently working at [company] on [thing]"
- Use NATURAL, CONVERSATIONAL language that real people would write
- Mix career stages: founders, employees, consultants, researchers, career changers, retirees re-entering
- Diverse domains: rural healthcare, ocean tech, climate, agriculture, education, manufacturing, finance, etc.
- Some should be technical, some non-technical, some hybrid
- Vary the depth: some write a lot, some keep it minimal
- Include people from different locations (not just Portland)

For each person, provide:
1. name: Full name (varied ethnicity, gender)
2. email: realistic email (use proper format)
3. background: Their professional background (2-4 sentences, VARIED style)
4. expertise: What they're good at (1-3 sentences, natural language)
5. interests: What problems they care about (1-3 sentences)
6. how_i_help: Array of 1-3 from: ["advising", "coffee_chats", "feedback", "introductions", "cofounding", "not_available"]
7. linkedin_url: realistic LinkedIn URL (format: https://linkedin.com/in/firstname-lastname)

IMPORTANT: Escape all quotes in text fields! Use straight quotes only, no smart quotes or apostrophes.

Return ONLY valid JSON array with ${batchSize} profiles. No markdown, no explanation, just the JSON array.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      temperature: 0.9, // Lower temperature for more consistent JSON
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0].text;
    
    // Try to extract and clean JSON
    let jsonText = content;
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Extract JSON array
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON array from response');
    }
    
    // Clean up common issues
    jsonText = jsonMatch[0]
      .replace(/[\u2018\u2019]/g, "'")  // Replace smart single quotes
      .replace(/[\u201C\u201D]/g, '"')  // Replace smart double quotes
      .replace(/\n/g, ' ')              // Remove newlines in strings
      .replace(/\s+/g, ' ');            // Normalize whitespace
    
    const profiles = JSON.parse(jsonText);
    
    if (!Array.isArray(profiles) || profiles.length === 0) {
      throw new Error('Invalid profiles array');
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
  // Import cleanText from lib
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
  console.log('🚀 Generating 100 realistic, varied profiles...\n');

  const orgId = await getDefaultOrg();
  console.log(`✓ Using organization: ${orgId}\n`);

  const totalProfiles = 100;
  const batchSize = 10; // Generate 10 at a time
  const batches = Math.ceil(totalProfiles / batchSize);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < batches; i++) {
    const currentBatchSize = Math.min(batchSize, totalProfiles - (i * batchSize));
    
    try {
      // Generate batch with Claude
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
        console.log('  ⏳ Waiting 3 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 3000));
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
  console.log(`   Total: ${totalProfiles}`);
  console.log('='.repeat(60));
  console.log('\n💡 Next step: Re-run clustering');
  console.log('   npm run cluster\n');
}

generateProfiles()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

