import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Inline buildProfileText to avoid import issues
function buildProfileText(member) {
  return `
    Background: ${member.background || ''}
    Expertise: ${member.expertise || ''}
    Interests: ${member.interests || ''}
    How they help: ${member.how_i_help ? member.how_i_help.join(', ') : ''}
    Looking for: ${member.looking_for || ''}
    Open to: ${member.open_to || ''}
    Current work: ${member.current_work || ''}
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
  console.log('\n🔄 REGENERATING EMBEDDINGS WITH ENHANCED FIELDS\n');
  console.log('Model: text-embedding-3-small (1536 dimensions)');
  console.log('Enhanced fields: looking_for, open_to, current_work');
  console.log('Cost: ~$0.01 for 300 profiles (65x cheaper than large model!)\n');

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }

  console.log(`📊 Found ${profiles.length} total profiles\n`);

  // Filter to only complete profiles worth re-embedding
  const completeProfiles = profiles.filter(p => {
    const hasBackground = p.background && 
                          p.background.length > 20 && 
                          !p.background.toLowerCase().includes('incomplete');
    const hasExpertise = p.expertise && 
                         p.expertise.length > 15 && 
                         !p.expertise.toLowerCase().includes('incomplete');
    return hasBackground && hasExpertise;
  });

  console.log(`✅ ${completeProfiles.length} complete profiles will be re-embedded\n`);

  if (completeProfiles.length === 0) {
    console.log('❌ No profiles to update');
    return;
  }

  // Estimate cost for text-embedding-3-small
  // $0.00002 per 1K tokens, ~150 tokens per profile
  const avgTokens = 150;
  const totalTokens = completeProfiles.length * avgTokens;
  const estimatedCost = (totalTokens / 1000 * 0.00002).toFixed(4);
  
  console.log(`💰 Cost breakdown:`);
  console.log(`   Profiles: ${completeProfiles.length}`);
  console.log(`   Estimated tokens: ${totalTokens.toLocaleString()}`);
  console.log(`   Rate: $0.00002 per 1K tokens (small model)`);
  console.log(`   Estimated cost: $${estimatedCost}\n`);
  console.log('⏳ Starting in 5 seconds... (Ctrl+C to cancel)\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  console.log('🚀 Processing...\n');

  for (const profile of completeProfiles) {
    try {
      // Build enhanced profile text with new fields
      const profileText = buildProfileText(profile);

      // Generate new embedding
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: profileText
      });

      const embedding = response.data[0].embedding;

      // Update in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ embedding })
        .eq('user_id', profile.user_id);

      if (updateError) {
        console.error(`  ❌ Error updating ${profile.name || profile.user_id}:`, updateError.message);
        errors++;
      } else {
        updated++;
        if (updated % 10 === 0) {
          console.log(`  ✓ Updated ${updated}/${completeProfiles.length}...`);
        }
      }

      // Rate limiting: 3,000 requests/min = 50/sec, so we can safely do ~10/sec
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error(`  ❌ Error processing profile:`, err.message);
      errors++;
    }
  }

  console.log('\n✅ COMPLETE!\n');
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total profiles: ${completeProfiles.length}\n`);

  if (updated > 0) {
    console.log('🎯 Next steps:');
    console.log('  1. Run clustering with new embeddings:');
    console.log('     node scripts/detect-clusters.js');
    console.log('  2. Check the new silhouette score');
    console.log('  3. Visit /communities to see improved clusters!\n');
  }
}

regenerateEmbeddings();

