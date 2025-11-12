import { createClient } from '@supabase/supabase-js';
import { generateEmbedding, buildProfileText } from '../lib/embeddings.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function embedAllProfiles() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log(`Generating embeddings for ${profiles.length} profiles...`);
  
  for (const profile of profiles) {
    const profileText = buildProfileText(profile);
    
    if (!profileText.trim()) {
      console.log(`⊘ Skipping ${profile.name} - no content to embed`);
      continue;
    }
    
    try {
      const embedding = await generateEmbedding(profileText);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ embedding })
        .eq('user_id', profile.user_id);
      
      if (updateError) {
        console.error(`✗ Error embedding ${profile.name}:`, updateError);
      } else {
        console.log(`✓ Embedded profile for ${profile.name}`);
      }
    } catch (err) {
      console.error(`✗ Error generating embedding for ${profile.name}:`, err.message);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('Done!');
}

embedAllProfiles();










