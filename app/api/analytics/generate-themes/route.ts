import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get org_id from request or user's orgs
    const { org_id } = await req.json();
    
    console.log('[Generate Themes] Starting analysis for org:', org_id);
    
    // Fetch all opted-in profiles from this organization
    let profiles: any[] = [];
    
    if (org_id) {
      // Filter by organization if provided
      const { data: orgMembers, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('org_id', org_id);
      
      if (membersError) {
        console.error('[Generate Themes] Error fetching org members:', membersError);
      } else if (orgMembers && orgMembers.length > 0) {
        const memberUserIds = orgMembers.map(m => m.user_id);
        
        const { data: orgProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            user_id,
            name,
            background,
            expertise,
            looking_for,
            open_to
          `)
          .in('user_id', memberUserIds)
          .eq('opted_in', true);
        
        if (!profilesError && orgProfiles) {
          profiles = orgProfiles;
        }
      }
    }
    
    // Fallback: fetch all opted-in profiles if no org filtering
    if (profiles.length === 0) {
      console.log('[Generate Themes] No org filtering, fetching all opted-in profiles');
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          name,
          background,
          expertise,
          looking_for,
          open_to
        `)
        .eq('opted_in', true);
      
      if (profilesError || !allProfiles || allProfiles.length === 0) {
        return NextResponse.json({ 
          error: 'No profiles found for analysis' 
        }, { status: 404 });
      }
      
      profiles = allProfiles;
    }

    console.log(`[Generate Themes] Analyzing ${profiles.length} profiles`);

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY?.trim(),
    });

    // Create analysis prompt
    const prompt = `Analyze these ${profiles.length} member profiles from an innovation community and identify the top 5-8 natural themes/clusters based on their backgrounds, expertise, and what they're seeking.

Member Profiles:
${JSON.stringify(profiles, null, 2)}

Look for patterns in:
- Domain/industry focus (climate tech, healthcare, AI, fintech, etc.)
- What they're building or working on
- What expertise they offer
- What they're looking for (cofounders, mentorship, domain expertise)
- Stage (idea stage, early traction, experienced operators)

Return ONLY valid JSON in this exact format:
{
  "themes": [
    {
      "name": "Theme Name",
      "description": "Brief description of this cluster",
      "member_count": 12,
      "member_names": ["Name 1", "Name 2"],
      "common_backgrounds": ["background pattern 1", "background pattern 2"],
      "common_needs": ["what they're seeking 1", "what they're seeking 2"],
      "common_offerings": ["what they can offer 1", "what they can offer 2"],
      "recommendation": "What the community organizer should do with this cluster"
    }
  ],
  "insights": [
    "Key insight about the community composition",
    "Notable gaps or opportunities"
  ]
}`;

    // Call Claude
    console.log('[Generate Themes] Calling Claude API...');
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Parse response
    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[Generate Themes] Received analysis from Claude');
    
    const analysis = JSON.parse(analysisText);

    // Store in database
    const { data: savedThemes, error: saveError } = await supabase
      .from('community_themes')
      .insert({
        org_id: org_id || null,
        themes: analysis,
        member_count: profiles.length,
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('[Generate Themes] Error saving themes:', saveError);
      return NextResponse.json({ 
        error: 'Failed to save analysis' 
      }, { status: 500 });
    }

    console.log('[Generate Themes] Analysis saved successfully');

    return NextResponse.json({
      success: true,
      themes: analysis,
      profiles_analyzed: profiles.length,
      generated_at: savedThemes.generated_at
    });

  } catch (error: any) {
    console.error('[Generate Themes] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to generate themes' 
    }, { status: 500 });
  }
}

