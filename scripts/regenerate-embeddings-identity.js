/**
 * Regenerate Profile Embeddings - Identity-Based (3 Fields) + Filler Word Removal
 * 
 * Uses ONLY: background, expertise, interests
 * Does NOT include: how_i_help, looking_for, open_to, current_work
 * 
 * FILTERS OUT: filler words, generic jargon, vague terms
 * KEEPS: technical terms, domain knowledge, specific skills
 * 
 * Purpose: Ensure "My Clusters" groups similar people (identity), not similar availability/intent
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { cleanText } from '../lib/embeddings.js';

dotenv.config({ path: '.env.local' });

// Identity-based profile text (3 fields only)
function buildProfileText(member) {
  return `
    Background: ${member.background || ''}
    Expertise: ${member.expertise || ''}
    Interests: ${member.interests || ''}
  `.trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function regenerateEmbeddings() {
  console.log('🔄 Regenerating embeddings with identity-based approach (3 fields)...\n');

  // Fetch all profiles
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('user_id, name, background, expertise, interests')
    .eq('opted_in', true);

  if (fetchError) {
    console.error('❌ Error fetching profiles:', fetchError);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  No profiles found');
    process.exit(0);
  }

  console.log(`Found ${profiles.length} opted-in profiles\n`);

  // Filter profiles with enough data
  const validProfiles = profiles.filter(p => {
    const hasBackground = p.background && p.background.length > 20;
    const hasExpertise = p.expertise && p.expertise.length > 15;
    return hasBackground && hasExpertise;
  });

  console.log(`${validProfiles.length} profiles have sufficient data for embeddings\n`);

  let successCount = 0;
  let errorCount = 0;
  const batchSize = 10;

  for (let i = 0; i < validProfiles.length; i += batchSize) {
    const batch = validProfiles.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (profile) => {
      try {
        // Build identity-based profile text
        const profileText = buildProfileText(profile);
        
        if (!profileText || profileText.length < 50) {
          console.log(`⚠️  Skipping ${profile.name}: insufficient text`);
          return;
        }

        // Clean text to remove filler words
        const cleanedText = cleanText(profileText);
        
        if (!cleanedText || cleanedText.length < 20) {
          console.log(`⚠️  Skipping ${profile.name}: insufficient text after cleaning`);
          return;
        }

        // Generate new embedding with small model (1536 dimensions)
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: cleanedText
        });

        const embedding = response.data[0].embedding;

        // Update profile with new embedding
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ embedding: embedding })
          .eq('user_id', profile.user_id);

        if (updateError) {
          console.error(`❌ Error updating ${profile.name}:`, updateError.message);
          errorCount++;
        } else {
          successCount++;
          console.log(`✓ ${profile.name} (${successCount}/${validProfiles.length})`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${profile.name}:`, error.message);
        errorCount++;
      }
    }));

    // Rate limiting: wait between batches
    if (i + batchSize < validProfiles.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✨ Regeneration complete!`);
  console.log(`   ✓ Success: ${successCount}`);
  console.log(`   ✗ Errors: ${errorCount}`);
  console.log(`   Total: ${validProfiles.length}`);
  console.log('='.repeat(60));
  console.log('\n💡 Next step: Run clustering script to rebuild clusters');
  console.log('   npm run cluster\n');
}

regenerateEmbeddings()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

