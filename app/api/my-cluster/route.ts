import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
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

    if (profileError || !userProfile || !userProfile.embedding) {
      console.error('[My Cluster] Error fetching user profile:', profileError);
      return NextResponse.json({ 
        error: 'Profile not found or missing embedding' 
      }, { status: 404 });
    }

    // Find nearest neighbors using vector similarity
    // Get top 30 similar profiles (excluding self)
    const { data: matches, error: matchError } = await supabase.rpc(
      'match_profiles_contextual',
      {
        query_embedding: userProfile.embedding,
        match_threshold: 0.0, // Get all matches, we'll filter by top N
        match_count: 31 // Get 31 so we can exclude self and have 30
      }
    );

    if (matchError) {
      console.error('[My Cluster] Error finding matches:', matchError);
      return NextResponse.json({ 
        error: 'Failed to find similar profiles' 
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
    console.error('[My Cluster] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

