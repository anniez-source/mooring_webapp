import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { personId, conversationId, source = 'chat' } = await req.json();

    // For now, we'll use a placeholder user_id since we don't have auth
    const userId = 'temp-user-id';

    // Save to saved_contacts table
    const { data, error } = await supabase
      .from('saved_contacts')
      .insert({
        user_id: userId,
        saved_person_id: personId,
        source: source,
        source_detail: conversationId
      });

    if (error) {
      console.error('Error saving collaborator:', error);
      return NextResponse.json({ 
        error: 'Failed to save collaborator' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Collaborator saved successfully' 
    });

  } catch (error: any) {
    console.error('Save collaborator API error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}
