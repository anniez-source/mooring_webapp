import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get org_id from query params
    const { searchParams } = new URL(req.url);
    const org_id = searchParams.get('org_id');

    console.log('[Fetch Themes] Fetching themes for org:', org_id);

    let query = supabase
      .from('community_themes')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1);

    // Filter by org if provided
    if (org_id && org_id !== 'null') {
      query = query.eq('org_id', org_id);
    } else {
      // Get latest themes regardless of org
      query = query.is('org_id', null);
    }

    const { data: latestThemes, error } = await query.maybeSingle();

    if (error) {
      console.error('[Fetch Themes] Error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch themes' 
      }, { status: 500 });
    }

    if (!latestThemes) {
      return NextResponse.json({ 
        error: 'No themes found. Generate themes first.' 
      }, { status: 404 });
    }

    console.log('[Fetch Themes] Found themes generated at:', latestThemes.generated_at);

    return NextResponse.json({
      themes: latestThemes.themes,
      member_count: latestThemes.member_count,
      generated_at: latestThemes.generated_at
    });

  } catch (error: any) {
    console.error('[Fetch Themes] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch themes' 
    }, { status: 500 });
  }
}

