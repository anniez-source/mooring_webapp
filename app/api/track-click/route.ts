import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { savedProfileId, clickType } = await req.json();

    if (!savedProfileId || !clickType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (clickType !== 'email' && clickType !== 'linkedin') {
      return NextResponse.json({ error: 'Invalid click type' }, { status: 400 });
    }

    // Get user_id from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      console.error('[Track Click] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update the saved_contacts record
    const updateField = clickType === 'email' ? 'email_clicked' : 'linkedin_clicked';
    
    const { error: updateError } = await supabase
      .from('saved_contacts')
      .update({ [updateField]: true })
      .eq('user_id', userData.user_id)
      .eq('saved_profile_id', savedProfileId);

    if (updateError) {
      console.error('[Track Click] Error updating saved_contacts:', updateError);
      return NextResponse.json({ error: 'Failed to track click' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Track Click] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

