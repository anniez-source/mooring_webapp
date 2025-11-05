/**
 * API endpoint to track save behavior
 * Updates user_behavior when user saves a contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { trackSave } from '@/lib/behavior-learning-simplified';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, savedProfileId } = await request.json();

    if (!userId || !savedProfileId) {
      return NextResponse.json(
        { error: 'Missing userId or savedProfileId' },
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
      console.warn('[Track Save] User not found for Clerk ID:', userId);
      return NextResponse.json({ success: true }); // Silent fail, don't block UX
    }

    await trackSave(userData.user_id, savedProfileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking save:', error);
    return NextResponse.json(
      { error: 'Failed to track save' },
      { status: 500 }
    );
  }
}

