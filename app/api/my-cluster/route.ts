import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to parse Supabase vector strings into arrays
function parseVector(vector: any): number[] | null {
  if (!vector) return null;
  if (Array.isArray(vector)) return vector;
  if (typeof vector === 'string') {
    try {
      const parsed = JSON.parse(vector);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    console.log('[My Cluster] Starting request...');
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      console.log('[My Cluster] No Clerk user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[My Cluster] Clerk User ID:', clerkUserId);

    // Get database user_id from Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      console.error('[My Cluster] Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dbUserId = userData.user_id;
    console.log('[My Cluster] Database User ID:', dbUserId);

    // Get user's profile with embedding
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', dbUserId)
      .single();

    if (profileError || !userProfile) {
      console.error('[My Cluster] Error fetching user profile:', profileError);
      return NextResponse.json({ 
        error: 'Profile not found',
        details: profileError?.message 
      }, { status: 404 });
    }

    if (!userProfile.embedding) {
      console.error('[My Cluster] User profile has no embedding');
      return NextResponse.json({ 
        error: 'Your profile needs an embedding to find similar people. Please update your profile and try again.',
        needsEmbedding: true
      }, { status: 400 });
    }

    // Parse the embedding (Supabase returns it as a string)
    const parsedEmbedding = parseVector(userProfile.embedding);
    console.log('[My Cluster] Embedding type:', typeof userProfile.embedding);
    console.log('[My Cluster] Parsed embedding exists:', !!parsedEmbedding);
    console.log('[My Cluster] Parsed embedding length:', parsedEmbedding?.length);

    if (!parsedEmbedding) {
      console.error('[My Cluster] Failed to parse embedding');
      return NextResponse.json({ 
        error: 'Failed to parse your profile embedding',
        needsRegeneration: true
      }, { status: 400 });
    }

    // Find nearest neighbors using vector similarity
    console.log('[My Cluster] About to call match_profiles_contextual...');
    
    // Get top 30 similar profiles (excluding self)
    const { data: matches, error: matchError } = await supabase.rpc(
      'match_profiles_contextual',
      {
        query_embedding: parsedEmbedding,
        match_threshold: 0.0, // Get all matches, we'll filter by top N
        match_count: 31 // Get 31 so we can exclude self and have 30
      }
    );

    console.log('[My Cluster] RPC call completed');
    console.log('[My Cluster] Match error:', matchError);
    console.log('[My Cluster] Matches found:', matches?.length);

    if (matchError) {
      console.error('[My Cluster] Error finding matches:', matchError);
      return NextResponse.json({ 
        error: 'Failed to find similar profiles',
        details: matchError.message,
        code: matchError.code
      }, { status: 500 });
    }

    // Filter out self and limit to top 30
    const similarProfiles = (matches || [])
      .filter((p: any) => p.user_id !== dbUserId)
      .slice(0, 30)
      .map((profile: any) => ({
        user_id: profile.user_id,
        name: profile.name,
        email: profile.email,
        background: profile.background,
        interests: profile.interests,
        expertise: profile.expertise,
        how_i_help: profile.how_i_help,
        linkedin_url: profile.linkedin_url,
        profile_picture: profile.profile_picture,
        similarity: Math.round((profile.similarity || 0) * 100), // Convert to percentage
      }));

    console.log('[My Cluster] Found', similarProfiles.length, 'similar profiles');

    return NextResponse.json({
      userProfile: {
        name: userProfile.name,
        background: userProfile.background,
        interests: userProfile.interests,
        expertise: userProfile.expertise,
      },
      similarProfiles,
      totalMatches: similarProfiles.length
    });

  } catch (error) {
    console.error('[My Cluster] FATAL ERROR:', error);
    console.error('[My Cluster] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: String(error)
    }, { status: 500 });
  }
}

