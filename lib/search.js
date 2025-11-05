import { createClient } from '@supabase/supabase-js';
import { generateEmbedding, buildContextualQuery } from './embeddings.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function findContextualMatches(userQuery, userId) {
  // Get searcher's profile
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (!userProfile) {
    throw new Error('User profile not found');
  }
  
  // Build contextual query embedding
  const contextualQuery = buildContextualQuery(userQuery, userProfile);
  const queryEmbedding = await generateEmbedding(contextualQuery);
  
  // Find matches using similarity function
  const { data: matches, error } = await supabase.rpc(
    'match_profiles_contextual',
    {
      query_embedding: queryEmbedding,
      match_threshold: 0.6,
      match_count: 20
    }
  );
  
  if (error) {
    console.error('Error finding matches:', error);
    return [];
  }
  
  return matches;
}

export async function updateProfileWithEmbedding(userId, updates) {
  // Update profile fields
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId);
  
  if (updateError) throw updateError;
  
  // Get updated profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (!profile) throw new Error('Profile not found after update');
  
  // Import here to avoid circular dependency
  const { generateEmbedding, buildProfileText } = await import('./embeddings.js');
  
  // Regenerate embedding
  const profileText = buildProfileText(profile);
  const embedding = await generateEmbedding(profileText);
  
  // Update embedding
  await supabase
    .from('profiles')
    .update({ embedding })
    .eq('user_id', userId);
}







