import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    console.log('[Save Contact] Clerk user ID:', clerkUserId);
    
    if (!clerkUserId) {
      return NextResponse.json({ 
        error: 'Unauthorized - please sign in' 
      }, { status: 401 });
    }

    const { savedProfileId, reason, chatSessionId } = await req.json();
    
    console.log('[Save Contact] Request data:', { savedProfileId, chatSessionId, reason: reason?.substring(0, 50) });

    if (!savedProfileId) {
      return NextResponse.json({ 
        error: 'Profile ID is required' 
      }, { status: 400 });
    }

    // Get the current user's user_id from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !userData) {
      console.error('[Save Contact] User not found:', userError);
      return NextResponse.json({ 
        error: 'User not found. Please complete your profile first.' 
      }, { status: 404 });
    }
    
    console.log('[Save Contact] User found:', userData.user_id);

    // Verify the profile exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', savedProfileId)
      .single();
      
    if (profileError || !profileData) {
      console.error('[Save Contact] Profile not found:', savedProfileId, profileError);
      return NextResponse.json({ 
        error: 'Profile not found. This profile may not exist or may have been deleted.' 
      }, { status: 404 });
    }

    // Validate UUID format (only insert if it's a real UUID, not the temporary string)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validChatSessionId = chatSessionId && uuidRegex.test(chatSessionId) ? chatSessionId : null;
    
    console.log('[Save Contact] Chat session ID validation:', { 
      received: chatSessionId, 
      isValid: validChatSessionId !== null,
      willSave: validChatSessionId 
    });

    // Save to saved_contacts table
    const { data, error } = await supabase
      .from('saved_contacts')
      .insert({
        user_id: userData.user_id,
        saved_profile_id: savedProfileId,
        chat_session_id: validChatSessionId,
        reason: reason || 'Saved from AI matching',
      })
      .select();

    if (error) {
      // Check if it's a duplicate save
      if (error.code === '23505') {
        console.log('[Save Contact] Duplicate save attempt');
        return NextResponse.json({ 
          error: 'You have already saved this contact' 
        }, { status: 400 });
      }
      
      console.error('[Save Contact] Database error:', error);
      return NextResponse.json({ 
        error: `Failed to save contact: ${error.message}` 
      }, { status: 500 });
    }

    console.log('[Save Contact] Success:', data);
    return NextResponse.json({ 
      success: true,
      data 
    });

  } catch (error: any) {
    console.error('[Save Contact] API error:', error);
    return NextResponse.json({ 
      error: `An unexpected error occurred: ${error.message}` 
    }, { status: 500 });
  }
}
