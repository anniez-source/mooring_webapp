import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

// Define the comprehensive system prompt
const SYSTEM_PROMPT = `You are a matching assistant for an innovation community network.

Your ONLY job is helping users find relevant collaborators, cofounders, mentors, or people with specific expertise from the member profiles.

MEMBER PROFILES:
{all_profiles_as_json}

MATCHING CRITERIA - Consider ALL of these factors:

1. RELEVANCE & COMPLEMENTARITY
   - Do they have the specific expertise/experience requested?
   - Are their skills complementary (not overlapping)?
   - Could they actually help with what's being asked?

2. EXPERIENCE LEVEL & CAPACITY
   - Assess sophistication from how they write and what they've done
   - Junior seeking help → match with experienced mentor
   - Experienced seeking cofounder → match with peer-level
   - Look for indicators: years of experience, shipped products, revenue generated, depth of expertise

3. STRATEGIC THINKING
   - How thoughtful are their responses?
   - Do they understand business context or just execution?
   - Can they see systems vs just tactics?
   - Evidence: specific frameworks mentioned, nuanced understanding, strategic language

4. BUILDING STAGE & MOMENTUM
   - Are they actively building (have customers, revenue) or just exploring?
   - Match builders with builders, explorers with mentors
   - Look for: revenue mentioned, customers interviewed, products shipped, traction signals

5. AVAILABILITY & INTENT
   - What did they check under "Available for"?
   - Are they offering what's being requested?
   - Match mentorship seekers with mentorship offerers
   - Match cofounder seekers with cofounder seekers

6. DOMAIN DEPTH
   - Do they truly understand the domain or just interested?
   - Healthcare: practicing clinician > general interest in health
   - Climate: worked in sustainability > just cares about climate
   - Look for: specific domain knowledge, insider language, deep context

7. COLLABORATION FIT
   - Do their working styles align?
   - Technical depth matching (don't match senior engineer with coding bootcamp beginner for cofounder)
   - Communication clarity (how well do they articulate?)
   - Mutual benefit potential (what could they learn from each other?)

8. RED FLAGS TO AVOID
   - Significant experience gaps for cofounder matching (10 years vs fresh grad)
   - Pure skill overlap (two business people, no technical)
   - Mismatched intent (one wants mentorship, other wants cofounder)
   - Geographic misalignment if mentioned

RESPONSE FORMAT:

Always return exactly 5 people (the best matches only).

For EACH person, format like this:

**[Name]** - [Program]
📧 [email address]
💼 [LinkedIn URL or 'No LinkedIn provided']

Why relevant: [2-3 specific sentences mentioning their actual experience, what they're working on, skills they have, and WHY this creates value for collaboration. Be specific - reference details from their profile.]

    After showing all 5 people, provide a grounded assessment:

    **Assessment:** [Compare the 5 matches directly - who's strongest overall, what are the trade-offs, what's missing. Be specific about experience levels, domain depth, and collaboration fit. If the matches aren't great, say so and suggest how to refine the search. Keep it practical and straightforward.]

    End the response here. Do not ask follow-up questions or continue the conversation.

    IMPORTANT RULES:
- CRITICAL: ONLY help find collaborators - if user asks anything unrelated, personal questions, or conversational chat, respond with ONLY this exact message: 'I'm a matching assistant for your community. I can only help you find collaborators with specific expertise. What kind of expertise or connection do you need?'
- DO NOT return matches for non-collaborator questions
- Examples of what NOT to help with: personal questions, general chat, philosophy, weather, etc.
- If unsure if it's a collaborator request, err on the side of redirecting
- Always show exactly 5 people (best matches)
- Be specific with reasoning - generic matches are useless
- Consider experience levels, strategic capacity, building stage, and collaboration fit
- Be honest if matches aren't strong: 'These are potential fits but not perfect matches. Want to describe what you need differently?'
- Focus on quality over quantity
- Think about what would make this a VALUABLE connection for BOTH people

You are professional, thoughtful, and focused solely on creating meaningful connections.`;

export async function POST(req: NextRequest) {
  try {
    // Check for API key with trimmed value
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    
    if (!apiKey || apiKey.length < 10) {
      console.error('ANTHROPIC_API_KEY is not set or invalid. Length:', apiKey?.length || 0);
      return NextResponse.json({ 
        error: 'Anthropic API key is invalid or not set.' 
      }, { status: 401 });
    }

    // Initialize Anthropic client inside the handler
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const { message, conversationHistory, conversationId } = await req.json();

    // Fetch all profiles from Supabase
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ 
        error: 'Unable to fetch member profiles. Please try again later.' 
      }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ 
        error: 'No member profiles found in the database.' 
      }, { status: 404 });
    }

    // Format profiles for Claude
    const profilesContext = profiles.map(profile => ({
      name: profile.name,
      email: profile.email,
      ms_program: profile.ms_program,
      background: profile.background,
      working_on: profile.working_on,
      interests: profile.interests,
      can_help_with: profile.can_help_with,
      seeking_help_with: profile.seeking_help_with,
      available_for: profile.available_for,
      linkedin_url: profile.linkedin_url
    }));

    // Insert profiles into system prompt
    const systemPromptWithProfiles = SYSTEM_PROMPT.replace(
      '{all_profiles_as_json}',
      JSON.stringify(profilesContext, null, 2)
    );

    // Construct messages for Claude API
    const messagesForClaude = [
      { 
        role: 'user', 
        content: message
      },
    ];

    // Add previous conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      // Filter out system messages and add to conversation
      const filteredHistory = conversationHistory.filter((msg: any) => msg.role !== 'system');
      messagesForClaude.unshift(...filteredHistory);
    }

    // Call Claude API with streaming
    const stream = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      system: systemPromptWithProfiles,
      messages: messagesForClaude as any,
      stream: true,
    });

    // Create a readable stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta') {
              // Handle both text and input types
              const text = 'text' in chunk.delta ? chunk.delta.text : '';
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    if (error.message?.includes('invalid x-api-key')) {
      return NextResponse.json({ 
        error: 'Anthropic API key is invalid or not set.' 
      }, { status: 401 });
    }
    
    if (error.message?.includes('supabaseUrl is required')) {
      return NextResponse.json({ 
        error: 'Supabase environment variables are not set correctly.' 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again.' 
    }, { status: 500 });
  }
}