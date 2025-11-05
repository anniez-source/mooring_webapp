/**
 * API endpoint to track profile view behavior
 * Updates user_behavior when user views a profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { trackProfileView } from '@/lib/behavior-learning-simplified';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, viewedProfileId } = await request.json();

    if (!userId || !viewedProfileId) {
      return NextResponse.json(
        { error: 'Missing userId or viewedProfileId' },
        { status: 400 }
      );
    }

    // Convert Clerk user ID to database UUID
    const { data: userData } = await supabase
      .from('users')
      .select('user_id')
      .eq('clerk_user_id', userId)
      .single();

    if (!userData) {
      console.warn('[Track View] User not found for Clerk ID:', userId);
      return NextResponse.json({ success: true }); // Silent fail, don't block UX
    }

    await trackProfileView(userData.user_id, viewedProfileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking view:', error);
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    );
  }
}

