import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../../../lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Fetch all profiles from Supabase
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Log the search query (optional - don't fail if table doesn't exist)
    try {
      const { error: searchLogError } = await supabase
        .from('searches')
        .insert([{
          query: query.trim(),
          created_at: new Date().toISOString()
        }]);

      if (searchLogError) {
        console.error('Error logging search:', searchLogError);
        // Don't fail the request if logging fails
      }
    } catch (logError) {
      console.log('Search logging not available (table may not exist yet)');
    }

    // Prepare profiles for Claude
    const profilesForClaude = profiles.map(profile => ({
      name: profile.name,
      email: profile.email,
      ms_program: profile.ms_program,
      background: profile.background,
      working_on: profile.working_on,
      interests: profile.interests,
      can_help_with: profile.can_help_with,
      available_for: profile.available_for,
      seeking_help_with: profile.seeking_help_with,
      linkedin_url: profile.linkedin_url
    }));

    // Check if Anthropic API key is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
      return NextResponse.json({ 
        error: 'AI search is not configured yet. Please add your Anthropic API key to enable intelligent matching.' 
      }, { status: 503 });
    }

    // Call Claude API
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are a matching assistant for an innovation community.

A user is searching for: "${query}"

Here are the member profiles: ${JSON.stringify(profilesForClaude, null, 2)}

Rank the top 10 most relevant people. For each, explain WHY they're relevant (2-3 sentences) focusing on complementary skills, relevant experience, and what they could help with.

Return JSON array:
[{"name": "string", "relevance_score": number, "reasoning": "string"}]`
      }]
    });

    const claudeContent = claudeResponse.content[0];
    if (claudeContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse Claude's response
    let claudeResults;
    try {
      // Extract JSON from Claude's response
      const jsonMatch = claudeContent.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in Claude response');
      }
      claudeResults = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      console.error('Claude response:', claudeContent.text);
      return NextResponse.json({ error: 'Failed to parse search results' }, { status: 500 });
    }

    // Merge Claude results with profile data
    const results = claudeResults.map((claudeResult: any) => {
      const profile = profiles.find(p => p.name === claudeResult.name);
      if (!profile) {
        console.warn(`Profile not found for name: ${claudeResult.name}`);
        return null;
      }

      return {
        name: profile.name,
        relevance_score: claudeResult.relevance_score,
        reasoning: claudeResult.reasoning,
        ms_program: profile.ms_program,
        working_on: profile.working_on,
        email: profile.email,
        linkedin_url: profile.linkedin_url,
        background: profile.background,
        interests: profile.interests,
        can_help_with: profile.can_help_with,
        available_for: profile.available_for,
        seeking_help_with: profile.seeking_help_with
      };
    }).filter(Boolean);

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
