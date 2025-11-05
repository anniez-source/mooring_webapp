import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Check Saved] Clerk User ID:', clerkUserId);

    // Get database UUID from Clerk user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      console.error('[Check Saved] Error fetching user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dbUserId = userData.user_id;
    console.log('[Check Saved] Database User ID:', dbUserId);

    // Get all saved profile IDs for this user
    const { data: savedContacts, error: savedError } = await supabase
      .from('saved_contacts')
      .select('saved_profile_id')
      .eq('user_id', dbUserId);

    if (savedError) {
      console.error('[Check Saved] Error fetching saved contacts:', savedError);
      return NextResponse.json({ error: 'Failed to fetch saved contacts' }, { status: 500 });
    }

    const savedProfileIds = savedContacts?.map(c => c.saved_profile_id) || [];
    console.log('[Check Saved] Found', savedProfileIds.length, 'saved profiles');

    return NextResponse.json({ savedProfileIds });
  } catch (error) {
    console.error('[Check Saved] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

