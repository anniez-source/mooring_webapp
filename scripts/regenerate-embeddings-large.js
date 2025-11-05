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

async function regenerateEmbeddingsLarge() {
  console.log('\n🚀 UPGRADING TO text-embedding-3-large (3072 dimensions)\n');
  console.log('This includes enhanced fields: looking_for, open_to, current_work');
  console.log('Model: text-embedding-3-large (3072-dim)');
  console.log('Cost: ~$0.40 for 300 profiles\n');

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

  // Calculate actual cost for text-embedding-3-large
  // $0.00130 per 1K tokens (vs $0.00002 for small)
  const avgTokens = 150; // Estimated avg tokens per profile
  const totalTokens = completeProfiles.length * avgTokens;
  const estimatedCost = (totalTokens / 1000) * 0.00130;
  
  console.log(`💰 Cost breakdown:`);
  console.log(`   Profiles: ${completeProfiles.length}`);
  console.log(`   Estimated tokens: ${totalTokens.toLocaleString()}`);
  console.log(`   Rate: $0.00130 per 1K tokens`);
  console.log(`   Estimated cost: $${estimatedCost.toFixed(4)}\n`);
  
  console.log(`📈 Benefits:`);
  console.log(`   • 3072 dimensions (vs 1536) = finer distinctions`);
  console.log(`   • Enhanced fields (intent + stage signals)`);
  console.log(`   • Expected silhouette: 0.255 → ~0.35-0.40\n`);
  
  console.log('⏳ Starting in 5 seconds... (Ctrl+C to cancel)\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  let updated = 0;
  let errors = 0;
  const startTime = Date.now();

  console.log('🚀 Processing...\n');

  for (const profile of completeProfiles) {
    try {
      // Build enhanced profile text with new fields
      const profileText = buildProfileText(profile);

      // Generate new embedding with LARGE model
      const response = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: profileText
      });

      const embedding = response.data[0].embedding;

      // Verify it's 3072 dimensions
      if (embedding.length !== 3072) {
        console.error(`  ⚠️  Warning: Expected 3072 dims, got ${embedding.length}`);
      }

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
          const rate = (updated / (Date.now() - startTime) * 1000).toFixed(1);
          console.log(`  ✓ Updated ${updated}/${completeProfiles.length} (${rate}/sec, ${elapsed}s elapsed)`);
        }
      }

      // Rate limiting: 3,000 requests/min = 50/sec, so we can safely do ~10/sec
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error(`  ❌ Error processing profile:`, err.message);
      errors++;
      
      // If rate limited, wait longer
      if (err.message?.includes('rate') || err.message?.includes('429')) {
        console.log('  ⏸️  Rate limited, waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n✅ COMPLETE!\n');
  console.log(`  Updated: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total time: ${totalTime}s`);
  console.log(`  Rate: ${(updated / totalTime).toFixed(1)} profiles/sec\n`);

  if (updated > 0) {
    console.log('🎯 Next steps:');
    console.log('  1. Run clustering with new 3072-dim embeddings:');
    console.log('     node scripts/detect-clusters.js');
    console.log('  2. Check the new silhouette score');
    console.log('  3. Expected improvement: 0.255 → 0.35-0.40');
    console.log('  4. Visit /communities to see improved clusters!\n');
  }
}

regenerateEmbeddingsLarge();

