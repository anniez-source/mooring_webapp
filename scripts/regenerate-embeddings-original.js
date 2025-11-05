import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Original 4-field profile text (what worked best)
function buildProfileText(member) {
  return `
    Background: ${member.background || ''}
    Expertise: ${member.expertise || ''}
    Interests: ${member.interests || ''}
    How they help: ${member.how_i_help ? member.how_i_help.join(', ') : ''}
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
  console.log('\n🔄 RESTORING ORIGINAL EMBEDDINGS (4 fields)\n');
  console.log('Model: text-embedding-3-small (1536 dimensions)');
  console.log('Fields: background, expertise, interests, how_i_help');
  console.log('This was the best-performing configuration (score: 0.255)\n');

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    return;
  }

  console.log(`📊 Found ${profiles.length} total profiles\n`);

  // Filter to only complete profiles
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

  // Estimate cost
  const avgTokens = 120; // Less tokens with fewer fields
  const totalTokens = completeProfiles.length * avgTokens;
  const estimatedCost = (totalTokens / 1000 * 0.00002).toFixed(4);
  
  console.log(`💰 Cost: $${estimatedCost}\n`);
  console.log('⏳ Starting in 5 seconds... (Ctrl+C to cancel)\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  let updated = 0;
  let errors = 0;
  const startTime = Date.now();

  console.log('🚀 Processing...\n');

  for (const profile of completeProfiles) {
    try {
      // Build original 4-field profile text
      const profileText = buildProfileText(profile);

      // Generate embedding with small model
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
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`  ✓ Updated ${updated}/${completeProfiles.length} (${elapsed}s)`);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error(`  ❌ Error:`, err.message);
      errors++;
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✅ COMPLETE!\n');
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Time: ${totalTime}s\n`);

  if (updated > 0) {
    console.log('🎯 Next: node scripts/detect-clusters.js');
    console.log('Expected: k=8, score ~0.255 (best result)\n');
  }
}

regenerateEmbeddings();



