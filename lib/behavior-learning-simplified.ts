/**
 * Simplified Behavior Learning Module
 * 
 * Tracks user behavior WITHOUT needing chat_sessions table
 * Updates user_behavior directly from actions: searches, saves, views
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Parse Supabase vector string to number array
 * Supabase returns VECTOR columns as strings like "[0.1, 0.2, ...]"
 */
function parseVector(vector: any): number[] | null {
  if (!vector) return null;
  if (Array.isArray(vector)) return vector;
  if (typeof vector === 'string') {
    try {
      return JSON.parse(vector);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Generate an embedding from a search query or interaction context
 */
export async function generateQueryEmbedding(
  queryText: string
): Promise<number[] | null> {
  try {
    if (!queryText || queryText.length < 3) return null;

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: queryText.slice(0, 8000)
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    return null;
  }
}

/**
 * Calculate engagement score based on actions
 */
export function calculateEngagementScore(
  totalSearches: number,
  totalSaves: number,
  totalViews: number
): number {
  let score = 0;
  
  // Search activity (0-30 points)
  score += Math.min(30, totalSearches * 2);
  
  // Saves (0-40 points) - strongest signal
  score += Math.min(40, totalSaves * 5);
  
  // Profile views (0-30 points)
  score += Math.min(30, totalViews * 1);
  
  return Math.min(100, score);
}

/**
 * Update user behavior when they perform a search
 */
export async function trackSearch(
  userId: string,
  searchQuery: string
) {
  try {
    // Generate embedding from search query
    const queryEmbedding = await generateQueryEmbedding(searchQuery);
    
    // Get or create user_behavior record
    let { data: behavior } = await supabase
      .from('user_behavior')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!behavior) {
      // First search - create new record
      const { error } = await supabase
        .from('user_behavior')
        .insert({
          user_id: userId,
          avg_embedding: queryEmbedding,
          recent_search_terms: [searchQuery],
          engagement_score: 2,
          total_searches: 1,
          last_interaction: new Date().toISOString()
        });

      if (error) console.error('Error creating user_behavior:', error);
      return;
    }

    // Update existing behavior
    const currentEmbedding = parseVector(behavior.avg_embedding);
    let newEmbedding = currentEmbedding;
    
    if (queryEmbedding && currentEmbedding) {
      // EMA with alpha = 0.2 (20% new, 80% old) - gradual learning
      const alpha = 0.2;
      newEmbedding = currentEmbedding.map((val: number, idx: number) => 
        alpha * queryEmbedding[idx] + (1 - alpha) * val
      );
    } else if (queryEmbedding) {
      newEmbedding = queryEmbedding;
    }

    // Update recent searches (keep last 15)
    const updatedSearchTerms = [searchQuery, ...(behavior.recent_search_terms || [])]
      .slice(0, 15);

    const newTotalSearches = (behavior.total_searches || 0) + 1;
    const newEngagement = calculateEngagementScore(
      newTotalSearches,
      behavior.total_saves || 0,
      behavior.total_profile_views || 0
    );

    // Update the record
    await supabase
      .from('user_behavior')
      .update({
        avg_embedding: newEmbedding,
        recent_search_terms: updatedSearchTerms,
        engagement_score: newEngagement,
        total_searches: newTotalSearches,
        last_interaction: new Date().toISOString()
      })
      .eq('user_id', userId);

    console.log(`✅ Tracked search for user ${userId}: "${searchQuery}"`);
  } catch (error) {
    console.error('Error in trackSearch:', error);
  }
}

/**
 * Update user behavior when they save a contact
 */
export async function trackSave(
  userId: string,
  savedProfileId: string,
  contextQuery?: string
) {
  try {
    // Get user_behavior record
    let { data: behavior } = await supabase
      .from('user_behavior')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!behavior) {
      // Create if doesn't exist
      const { error } = await supabase
        .from('user_behavior')
        .insert({
          user_id: userId,
          engagement_score: 5,
          total_saves: 1,
          last_interaction: new Date().toISOString()
        });

      if (error) console.error('Error creating user_behavior:', error);
      return;
    }

    // Optionally, blend in the saved person's profile embedding
    // This learns "what kind of people they actually save"
    const { data: savedProfile } = await supabase
      .from('profiles')
      .select('embedding')
      .eq('user_id', savedProfileId)
      .single();

    const currentEmbedding = parseVector(behavior.avg_embedding);
    const savedEmbedding = parseVector(savedProfile?.embedding);
    let newEmbedding = currentEmbedding;
    
    if (savedEmbedding && currentEmbedding) {
      // Blend their behavior with the type of person they saved
      // Higher alpha (0.3) because saves are strong signals
      const alpha = 0.3;
      newEmbedding = currentEmbedding.map((val: number, idx: number) => 
        alpha * savedEmbedding[idx] + (1 - alpha) * val
      );
    } else if (savedEmbedding) {
      // If no current embedding, use the saved profile's embedding
      newEmbedding = savedEmbedding;
    }

    const newTotalSaves = (behavior.total_saves || 0) + 1;
    const newEngagement = calculateEngagementScore(
      behavior.total_searches || 0,
      newTotalSaves,
      behavior.total_profile_views || 0
    );

    await supabase
      .from('user_behavior')
      .update({
        avg_embedding: newEmbedding,
        engagement_score: newEngagement,
        total_saves: newTotalSaves,
        last_interaction: new Date().toISOString()
      })
      .eq('user_id', userId);

    console.log(`✅ Tracked save for user ${userId}: engagement=${newEngagement.toFixed(1)}`);
  } catch (error) {
    console.error('Error in trackSave:', error);
  }
}

/**
 * Update user behavior when they view a profile
 */
export async function trackProfileView(
  userId: string,
  viewedProfileId: string
) {
  try {
    let { data: behavior } = await supabase
      .from('user_behavior')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!behavior) {
      const { error } = await supabase
        .from('user_behavior')
        .insert({
          user_id: userId,
          engagement_score: 1,
          total_profile_views: 1,
          last_interaction: new Date().toISOString()
        });

      if (error) console.error('Error creating user_behavior:', error);
      return;
    }

    const newTotalViews = (behavior.total_profile_views || 0) + 1;
    const newEngagement = calculateEngagementScore(
      behavior.total_searches || 0,
      behavior.total_saves || 0,
      newTotalViews
    );

    await supabase
      .from('user_behavior')
      .update({
        engagement_score: newEngagement,
        total_profile_views: newTotalViews,
        last_interaction: new Date().toISOString()
      })
      .eq('user_id', userId);

  } catch (error) {
    console.error('Error in trackProfileView:', error);
  }
}

/**
 * Blend static profile embedding with dynamic behavior embedding
 */
export function blendEmbeddings(
  profileEmbedding: number[],
  behaviorEmbedding: number[] | null,
  behaviorWeight: number = 0.3
): number[] {
  if (!behaviorEmbedding) return profileEmbedding;
  
  const profileWeight = 1 - behaviorWeight;
  
  return profileEmbedding.map((val, idx) => 
    profileWeight * val + behaviorWeight * behaviorEmbedding[idx]
  );
}

/**
 * Get adaptive embedding for a user (profile + behavior)
 */
export async function getAdaptiveEmbedding(userId: string): Promise<number[] | null> {
  try {
    // Get profile embedding
    const { data: profile } = await supabase
      .from('profiles')
      .select('embedding')
      .eq('user_id', userId)
      .single();

    if (!profile?.embedding) return null;

    // Get behavior embedding
    const { data: behavior } = await supabase
      .from('user_behavior')
      .select('avg_embedding, engagement_score')
      .eq('user_id', userId)
      .single();

    const profileEmbedding = parseVector(profile.embedding);
    const behaviorEmbedding = parseVector(behavior?.avg_embedding);

    // If no profile embedding, return null
    if (!profileEmbedding) return null;

    // If no behavior yet, just return profile
    if (!behaviorEmbedding || !behavior) {
      return profileEmbedding;
    }

    // Blend based on engagement (higher engagement = more weight on behavior)
    const behaviorWeight = Math.min(0.4, 0.2 + (behavior.engagement_score || 0) * 0.002);
    
    return blendEmbeddings(profileEmbedding, behaviorEmbedding, behaviorWeight);
  } catch (error) {
    console.error('Error getting adaptive embedding:', error);
    return null;
  }
}

