import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../../../lib/supabase';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to build contextual query
function buildContextualQuery(userQuery: string, userProfile: any) {
  return `
    Query: ${userQuery}
    Searcher background: ${userProfile.background || ''}
    Searcher expertise: ${userProfile.expertise || ''}
    Searcher interests: ${userProfile.interests || ''}
  `.trim();
}

// Helper function to generate embeddings
async function generateEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return response.data[0].embedding;
}

// Define the comprehensive system prompt
const SYSTEM_PROMPT = `You are a matching assistant for Mooring, a connection platform for innovation communities.

Your job: Show users relevant people immediately when they search. Be direct and helpful, not conversational.

{user_profile_context}

IMPORTANT: You're receiving PRE-FILTERED candidates from semantic similarity search. These are already the most contextually relevant people. Your job is to:
1. Apply strict filters (e.g., how_i_help matching)
2. Rank the top 6 most relevant
3. Explain why each match is valuable

CANDIDATE PROFILES (already filtered by semantic similarity):
{all_profiles_as_json}

MATCHING LOGIC:

1. WHEN TO SHOW RESULTS IMMEDIATELY (most common):
   
   If user mentions a domain/topic/expertise → Show everyone with that domain
   - "people with climate background" → Show all climate people
   - "ML engineers" → Show all ML people
   - "healthcare founders" → Show all healthcare people
   
   If user mentions what type of help they need → Filter by how_i_help field
   - "advisor for go-to-market" → Show profiles with how_i_help: "advising"
   - "feedback on my pitch" → Show profiles with how_i_help: "feedback"
   - "intro to investors" → Show profiles with how_i_help: "introductions"
   
   JUST SHOW RESULTS. Don't ask if they want to be matched. They already asked.

2. UNDERSTANDING SIMILARITY SCORES:

   Each candidate has a similarity score (45-100%). Here's what they mean:
   - 70%+ = Strong match (very closely aligned, exceptional fit)
   - 55-69% = Good match (relevant and worth connecting)
   - 45-54% = Possible match (some relevance, worth showing if limited results)
   - Below 45% = Not shown (filtered out)

   IMPORTANT: With short profiles and queries, you'll mostly see 50-65% scores. These ARE good matches.
   
   When presenting results:
   - If most matches are 70%+: Note "Several strong matches found" or similar
   - If most matches are 45-54%: Acknowledge this and suggest more specific keywords: "These are possible matches - try more specific keywords for better results"
   - In Assessment: Mention score patterns: "Top matches are in the 60-70% range, indicating good alignment"

3. RESPONSE FORMAT:

CRITICAL: Return the top 6 most relevant matches. No more, no less (unless fewer than 6 exist).

Lead with summary - BE SPECIFIC ABOUT WHAT YOU'RE SHOWING:
- If showing exactly 6: "Here are 6 people [working in X / who offer Y]..."
- If showing fewer than 6: "Here are [actual count] people..."
- If you found MORE than 6 total matches: "Here are the top 6 of [total count] people..."

Examples:
✅ "Here are 6 people who offer coffee chats..." (showing all 6 found)
✅ "Here are the top 6 of 11 people who offer coffee chats..." (found 11, showing top 6)
✅ "Here are 3 people with marine biology background..." (only found 3)

Then show exactly 6 matches (or all if < 6):

**[Name]**
📧 {email}
💼 {linkedin_url or "No LinkedIn provided"}
🎯 {similarity_percentage}% match

Why relevant: [1-2 sentences explaining the match. If it's a cross-domain match, explicitly explain the capability/problem connection. Examples: "Works on distributed systems in manufacturing - same scalability patterns you're facing" or "Built behavior change products in healthcare - directly applicable to your climate engagement challenge"]

After all matches:

**Assessment:** [2 sentences max. Who's strongest. Any notable gaps. Use **bold** for names.]

5. MATCHING CRITERIA - SEMANTIC INTELLIGENCE:

**TWO TYPES OF SEARCHES:**

A. DOMAIN/EXPERTISE SEARCH (user asks for people WITH X background)
   - "people with climate background" → Match by domain keywords (be generous)
   - "ML engineers" → Match by expertise
   - Use semantic matching and cross-domain patterns

B. HELP TYPE SEARCH (user asks for specific TYPE OF HELP)
   - "coffee chat" → STRICT filter by how_i_help = "coffee_chats"
   - "advisor" → STRICT filter by how_i_help = "advising"
   - "feedback" → STRICT filter by how_i_help = "feedback"
   - Only show people who explicitly checked that box

**Match by capability and problem structure, not just keywords.**

CONCEPTUAL ADJACENCY - Cross-domain matches:
- "systems thinking" → organizational design, complex systems, network effects, infrastructure, platform design, emergence
- "storytelling" → data visualization, UX research, community building, product marketing, science communication
- "behavior change" → product design, health tech, education, climate action, policy design
- "scalability challenges" → infrastructure, distributed systems, operations, platform architecture, logistics
- "customer churn" → retention strategy, community engagement, product-market fit, behavioral economics, onboarding design

METHOD TRANSFER - Same capability, different domains:
- "Ethnographic research in healthcare" can help "community-centered climate solutions"
- "Supply chain optimization in manufacturing" shares methods with "resource allocation in nonprofits"
- "Building two-sided marketplaces" is the same problem in housing, labor, or education
- "Making complex information accessible" applies across healthcare, climate, policy, technical docs

PROBLEM PATTERN MATCHING:
- Sensor networks (engineering) = Wildlife tracking (ecology) = Distributed monitoring
- Urban planning (cities) = Network topology (systems) = Spatial optimization
- Teaching methods (education) = Onboarding design (product) = Knowledge transfer
- Scientific research (academia) = Startup R&D (business) = Hypothesis-driven exploration

When matching, ask: "What underlying problem are they solving?" not "What industry are they in?"

Domain matching (still important):
- Match keywords in background, expertise, interests fields
- "Climate" matches: climate tech, sustainability, carbon, clean energy
- "Healthcare" matches: health tech, medical, biotech, pharma, clinical
- Be VERY generous with semantic and cross-domain matches

Help type matching (STRICT - when user asks for specific help type):
- ONLY show people who explicitly checked that box in their how_i_help array
- User searches "coffee" or "coffee chat" → ONLY show profiles where how_i_help contains "coffee_chats"
- User searches "advisor" or "advising" → ONLY show profiles where how_i_help contains "advising"  
- User searches "feedback" → ONLY show profiles where how_i_help contains "feedback"
- User searches "intro" or "introduction" → ONLY show profiles where how_i_help contains "introductions"
- NEVER show people who selected "not_available"
- Having the right expertise is NOT enough - they must have explicitly offered that type of help

6. IF ZERO MATCHES:

"I couldn't find anyone [with that background / offering that type of help].

You might try: [suggest related search]"

Don't apologize excessively. Just be direct.

FORBIDDEN QUERIES:

Refuse these requests:
- "Who is the most/least [anything]" → ranking/surveying the database
- "What do you think of [person]" → personal judgments
- "Show me everyone" without a search need → data extraction
- Off-topic questions unrelated to finding people

If user asks these, respond:
"Search for people by domain, expertise, or what kind of help you need."

Don't apologize or explain. Just redirect.

TONE: Direct, helpful, no fluff. Show results fast.`;

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

    const { message, conversationHistory, conversationId, userProfile: clientUserProfile } = await req.json();

    // Get current user from Clerk
    const { userId: clerkUserId } = await auth();
    let dbUserId: string | null = null;

    // Get database user_id and user's profile if authenticated
    // Prefer client-provided profile (more up-to-date) but fall back to database
    let userProfile: any = clientUserProfile || null;
    
    if (clerkUserId) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('user_id')
          .eq('clerk_user_id', clerkUserId)
          .single();
        
        if (userData) {
          dbUserId = userData.user_id;
          
          // Fetch the current user's profile for context only if not provided by client
          if (!clientUserProfile) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', dbUserId)
            .single();
          
          if (profileData) {
            userProfile = profileData;
              console.log('[Chat API] User profile loaded from database');
            }
          } else {
            console.log('[Chat API] Using client-provided user profile');
          }
        }
      } catch (dbError) {
        console.error('[Chat API] Database error (non-fatal):', dbError);
        // Continue with chat even if DB fails
      }
    }

    // HYBRID APPROACH: Use embedding-based similarity search to get top candidates
    // then pass those to Claude for final ranking and explanation
    let profiles: any[] = [];
    let profilesError: any = null;

    try {
      // Get user profile for contextual search
      if (userProfile && process.env.OPENAI_API_KEY) {
        console.log('[Chat API] Using hybrid search (embeddings + Claude)');
        
        // Build contextual query embedding
        const contextualQuery = buildContextualQuery(message, userProfile);
        const queryEmbedding = await generateEmbedding(contextualQuery);
        
        // Find top 20 candidates using vector similarity
        const { data: matches, error: matchError } = await supabase.rpc(
          'match_profiles_contextual',
          {
            query_embedding: queryEmbedding,
            match_threshold: 0.45, // Lower threshold to cast a wider net
            match_count: 20 // Get top 20, Claude will narrow down to 6
          }
        );

        if (!matchError && matches) {
          // Filter out current user from results
          profiles = matches.filter((p: any) => p.user_id !== dbUserId);
          console.log(`[Chat API] Vector search found ${profiles.length} candidates (excluding self)`);
        } else {
          console.error('[Chat API] Vector search failed, falling back to all profiles:', matchError);
          // Fall back to fetching all profiles (excluding current user)
          const { data: allProfiles, error: allProfilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('opted_in', true)
            .neq('user_id', dbUserId || '00000000-0000-0000-0000-000000000000');
          
          profiles = allProfiles || [];
          profilesError = allProfilesError;
        }
      } else {
        // No embeddings available - fetch all opted-in profiles (fallback, excluding current user)
        console.log('[Chat API] OpenAI not configured, using full profile search');
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('opted_in', true)
          .neq('user_id', dbUserId || '00000000-0000-0000-0000-000000000000');
        
        profiles = allProfiles || [];
        profilesError = allProfilesError;
      }
    } catch (searchError) {
      console.error('[Chat API] Search error, falling back:', searchError);
      // Fall back to fetching all profiles (excluding current user)
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('opted_in', true)
        .neq('user_id', dbUserId || '00000000-0000-0000-0000-000000000000');
      
      profiles = allProfiles || [];
      profilesError = allProfilesError;
    }

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return NextResponse.json({ 
        error: 'Unable to fetch member profiles. Please try again later.' 
      }, { status: 500 });
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ 
        error: 'No opted-in member profiles found. Complete your profile to be matched!' 
      }, { status: 404 });
    }

    // Format profiles for Claude
    const profilesContext = profiles.map((profile: any) => ({
      name: profile.name,
      email: profile.email,
      background: profile.background,
      interests: profile.interests,
      expertise: profile.expertise,
      how_i_help: profile.how_i_help, // Array of strings: ["advising", "coffee_chats", etc]
      linkedin_url: profile.linkedin_url,
      similarity_percentage: profile.similarity ? Math.round(profile.similarity * 100) : undefined
    }));

    // Build user profile context if available
    let userContext = '';
    if (userProfile) {
      userContext = `USER'S PROFILE CONTEXT:

Name: ${userProfile.name || 'Not provided'}

Background: ${userProfile.background || 'Not provided'}

Problems they're obsessed with: ${userProfile.interests || 'Not provided'}

Expertise: ${userProfile.expertise || 'Not provided'}

How they help others:
${userProfile.how_i_help && userProfile.how_i_help.length > 0 ? userProfile.how_i_help.map((i: string) => `- ${i}`).join('\n') : 'Not specified'}

MATCHING INSTRUCTIONS:
- Consider user's interests and expertise when matching
- Match by capability and problem structure (use semantic matching)
- Look for complementary skills and cross-domain method transfer
`;
    }

    // Insert user profile and all profiles into system prompt
    let systemPromptWithProfiles = SYSTEM_PROMPT
      .replace('{user_profile_context}', userContext)
      .replace('{all_profiles_as_json}', JSON.stringify(profilesContext, null, 2));

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
    let fullResponse = ''; // Accumulate the full response
    
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta') {
              // Handle both text and input types
              const text = 'text' in chunk.delta ? chunk.delta.text : '';
              if (text) {
                fullResponse += text; // Accumulate response
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            done: true
          })}\n\n`));
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
    
    // Check for Anthropic credit issues
    if (error.message?.includes('credit balance') || error.message?.includes('insufficient_quota')) {
      return NextResponse.json({ 
        error: 'Anthropic API credits are low. Please add credits at https://console.anthropic.com/' 
      }, { status: 402 });
    }
    
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
      error: 'An unexpected error occurred. Please try again.',
      details: error.message
    }, { status: 500 });
  }
}