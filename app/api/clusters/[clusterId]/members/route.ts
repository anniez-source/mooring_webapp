import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database user_id for current user
    const { data: userData } = await supabase
      .from('users')
      .select('user_id')
      .eq('clerk_user_id', userId)
      .single();
    
    const dbUserId = userData?.user_id;

    const { clusterId } = await params;
    console.log('[Cluster Members API] Fetching cluster:', clusterId);

    // Get cluster details with members via junction table
    const { data: cluster, error: clusterError } = await supabase
      .from('community_clusters')
      .select(`
        cluster_id, 
        label, 
        keywords, 
        org_id,
        cluster_members(user_id)
      `)
      .eq('cluster_id', clusterId)
      .single();

    console.log('[Cluster Members API] Cluster result:', { cluster, error: clusterError });

    if (clusterError || !cluster) {
      console.error('[Cluster Members API] Cluster not found:', clusterError);
      return NextResponse.json({ 
        error: 'Cluster not found',
        clusterId,
        details: clusterError 
      }, { status: 404 });
    }

    // Extract member IDs from junction table
    const memberIds = cluster.cluster_members?.map((m: any) => m.user_id) || [];
    
    if (memberIds.length === 0) {
      return NextResponse.json({
        cluster: {
          id: cluster.cluster_id,
          label: cluster.label,
          keywords: cluster.keywords,
          memberCount: 0
        },
        members: []
      });
    }

    // Get member profiles (excluding current user)
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('user_id, name, email, background, expertise, interests, how_i_help, linkedin_url, profile_picture')
      .in('user_id', memberIds)
      .eq('opted_in', true)
      .neq('user_id', dbUserId || '00000000-0000-0000-0000-000000000000');

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({
      cluster: {
        id: cluster.cluster_id,
        label: cluster.label,
        keywords: cluster.keywords,
        memberCount: memberIds.length
      },
      members: members || []
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

