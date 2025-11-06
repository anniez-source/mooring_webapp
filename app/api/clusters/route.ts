import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('clerk_user_id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: orgMembership, error: orgError } = await supabase
      .from('organization_members')
      .select('org_id, organizations(name)')
      .eq('user_id', userData.user_id)
      .single();

    if (orgError || !orgMembership) {
      return NextResponse.json({ 
        clusters: [],
        orgName: null,
        message: 'Not part of an organization'
      }, { status: 200 });
    }

    // Get clusters for this organization with member counts from junction table
    const { data: clusters, error: clustersError } = await supabase
      .from('community_clusters')
      .select(`
        cluster_id, 
        label, 
        keywords,
        cluster_members(user_id)
      `)
      .eq('org_id', orgMembership.org_id)
      .is('parent_cluster_id', null)  // Only get top-level clusters
      .order('label', { ascending: true });  // Sort alphabetically

    console.log('[Clusters API] Found', clusters?.length || 0, 'clusters for org', orgMembership.org_id);
    if (clusters && clusters.length > 0) {
      console.log('[Clusters API] First cluster:', clusters[0]);
    }

    if (clustersError) {
      console.error('Error fetching clusters:', clustersError);
      return NextResponse.json({ error: 'Failed to fetch clusters' }, { status: 500 });
    }

    // Transform clusters to include member_count from junction table
    const transformedClusters = (clusters || []).map(cluster => ({
      cluster_id: cluster.cluster_id,
      label: cluster.label,
      keywords: cluster.keywords,
      member_count: cluster.cluster_members?.length || 0,
      member_ids: cluster.cluster_members?.map((m: any) => m.user_id) || []
    }));

    return NextResponse.json({
      clusters: transformedClusters,
      orgName: (orgMembership.organizations as any)?.name || 'Your Organization',
      totalClusters: transformedClusters.length,
      currentUserId: userData.user_id  // Include user's ID for highlighting
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

