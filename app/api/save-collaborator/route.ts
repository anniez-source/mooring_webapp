import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { profileId, sourceDetail, source = 'chat' } = await req.json();

    // For now, we'll use a placeholder user_id since we don't have auth
    const userId = 'temp-user-id';

    // Save to saved_contacts table
    const { data, error } = await supabase
      .from('saved_contacts')
      .insert({
        user_id: userId,
        profile_id: profileId,
        conversation_id: sourceDetail,
        source: source,
      })
      .select();

    if (error) {
      console.error('Error saving collaborator:', error);
      return NextResponse.json({ 
        error: 'Failed to save collaborator' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      data 
    });

  } catch (error: any) {
    console.error('Save collaborator API error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
