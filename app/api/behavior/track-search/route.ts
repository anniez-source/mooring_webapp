/**
 * API endpoint to track search behavior
 * Updates user_behavior with search query embedding
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { trackSearch } from '@/lib/behavior-learning-simplified';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, searchQuery } = await request.json();

    if (!userId || !searchQuery) {
      return NextResponse.json(
        { error: 'Missing userId or searchQuery' },
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
      console.warn('[Track Search] User not found for Clerk ID:', userId);
      return NextResponse.json({ success: true }); // Silent fail, don't block UX
    }

    await trackSearch(userData.user_id, searchQuery);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking search:', error);
    return NextResponse.json(
      { error: 'Failed to track search' },
      { status: 500 }
    );
  }
}

