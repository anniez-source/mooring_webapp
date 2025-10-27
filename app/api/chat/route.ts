import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// Define the comprehensive system prompt
const SYSTEM_PROMPT = `You are a matching assistant for an innovation community network.

Your ONLY job is helping users find relevant collaborators, cofounders, mentors, or people with specific expertise from the member profiles.

{user_profile_context}

MEMBER PROFILES:
{all_profiles_as_json}

MATCHING CRITERIA - STRICT REQUIREMENTS:

**CRITICAL FIRST FILTER - EXPLICIT AVAILABILITY:**
Before considering ANY other factors, check the person's "available_for" (what they're open to):
- If user wants a COFOUNDER → ONLY show people who explicitly have "Being a cofounder for the right fit" in their available_for
- If user wants DOMAIN EXPERTISE → ONLY show people who have "Providing domain expertise" in their available_for
- If user wants INTRODUCTIONS → ONLY show people who have "Making introductions" in their available_for
- If user wants MENTORSHIP → ONLY show people who have "Mentoring" in their available_for

DO NOT show someone as a match if they haven't explicitly indicated availability for what's being requested. Having the right skills is NOT enough - they must have stated they're open to that type of collaboration.

After confirming explicit availability, THEN consider these factors:

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

5. DOMAIN DEPTH
   - Do they truly understand the domain or just interested?
   - Healthcare: practicing clinician > general interest in health
   - Climate: worked in sustainability > just cares about climate
   - Look for: specific domain knowledge, insider language, deep context

6. COLLABORATION FIT
   - Do their working styles align?
   - Technical depth matching (don't match senior engineer with coding bootcamp beginner for cofounder)
   - Communication clarity (how well do they articulate?)
   - Mutual benefit potential (what could they learn from each other?)

7. RED FLAGS TO AVOID
   - Significant experience gaps for cofounder matching (10 years vs fresh grad)
   - Pure skill overlap (two business people, no technical)
   - Someone who hasn't indicated availability for what's requested (MOST IMPORTANT)
   - Geographic misalignment if mentioned

RESPONSE FORMAT:

ONLY return people who have explicitly indicated availability for what's requested. If fewer than 5 people meet the strict availability criteria, return however many qualify (could be 0-5). Quality over quantity - do not pad results with people who haven't indicated availability.

For EACH person, format like this:

**[Name]** - [Program]
📧 [email address]
💼 [LinkedIn URL or 'No LinkedIn provided']

Why relevant: [2-3 specific sentences mentioning their actual experience, what they're working on, skills they have, and WHY this creates value for collaboration. Be specific - reference details from their profile.]

    After showing all 5 people, provide a grounded assessment:

    **Assessment:** [Compare the 5 matches directly - who's strongest overall, what are the trade-offs, what's missing. Be specific about experience levels, domain depth, and collaboration fit. If the matches aren't great, say so and suggest how to refine the search. Keep it practical and straightforward. IMPORTANT: When mentioning people's names in the assessment, wrap them in **bold** like this: **Name**]

    End the response here. Do not ask follow-up questions or continue the conversation.

    IMPORTANT RULES:
- CRITICAL: ONLY help find collaborators - if user asks anything unrelated, personal questions, or conversational chat, respond with ONLY this exact message: 'I'm a matching assistant for your community. I can only help you find collaborators with specific expertise. What kind of expertise or connection do you need?'
- DO NOT return matches for non-collaborator questions
- Examples of what NOT to help with: personal questions, general chat, philosophy, weather, etc.
- **ABSOLUTELY FORBIDDEN**: Queries that rank, compare, or survey the entire database:
  - "Who is the most/least [anything]" (experienced, junior, successful, etc.)
  - "Who has the most [anything]" (connections, experience, skills, etc.)
  - "Show me everyone who [criteria]" without a specific collaboration need
  - "Rank people by [anything]"
  - Any query designed to extract aggregate data or rankings about members
  - If user asks these types of questions, redirect with: 'I can only help you find specific collaborators for your needs, not rank or survey members. What kind of expertise or collaboration are you looking for?'
- If unsure if it's a collaborator request, err on the side of redirecting
- **STRICT AVAILABILITY REQUIREMENT**: Only show people who explicitly stated they're available for what's requested
- Return as many matches as qualify (0-5), prioritizing quality over quantity
- Be specific with reasoning - generic matches are useless
- Consider experience levels, strategic capacity, building stage, and collaboration fit AFTER confirming availability
- Be honest if no one meets the criteria: 'I couldn't find anyone who explicitly indicated they're available for [what was requested]. You might want to search for [alternative] or check back as more members join.'
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

    const { message, conversationHistory, conversationId, chatSessionId } = await req.json();

    // Get current user from Clerk
    const { userId: clerkUserId } = await auth();
    let dbUserId: string | null = null;
    let dbChatSessionId: string | null = chatSessionId || null;

    // Get database user_id and user's profile if authenticated
    let userProfile: any = null;
    
    if (clerkUserId) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('user_id')
          .eq('clerk_user_id', clerkUserId)
          .single();
        
        if (userData) {
          dbUserId = userData.user_id;
          
          // Fetch the current user's profile for context
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', dbUserId)
            .single();
          
          if (profileData) {
            userProfile = profileData;
            console.log('[Chat API] User profile loaded for context');
          }

          // Create or get chat session
          if (!dbChatSessionId) {
            // Get user's primary organization for session context
            const { data: userOrgs } = await supabase
              .from('organization_members')
              .select('org_id')
              .eq('user_id', dbUserId)
              .limit(1);
            
            const primaryOrgId = userOrgs && userOrgs.length > 0 ? userOrgs[0].org_id : null;
            
            const { data: newSession, error: sessionError } = await supabase
              .from('chat_sessions')
              .insert({
                user_id: dbUserId,
                org_id: primaryOrgId,
                title: message.substring(0, 100), // Use first 100 chars as title
                last_message_at: new Date().toISOString()
              })
              .select('chat_id')
              .single();
            
            if (!sessionError && newSession) {
              dbChatSessionId = newSession.chat_id;
            }
          }

          // Store user message to database
          if (dbChatSessionId) {
            await supabase
              .from('chat_messages')
              .insert({
                chat_session_id: dbChatSessionId,
                role: 'user',
                content: message,
                created_at: new Date().toISOString()
              });
          }
        }
      } catch (dbError) {
        console.error('[Chat API] Database error (non-fatal):', dbError);
        // Continue with chat even if DB fails
      }
    }

    // Fetch profiles from Supabase
    // Filter by organization if user has organizations, otherwise show all opted-in profiles
    let profiles: any[] = [];
    let profilesError: any = null;

    if (dbUserId) {
      try {
        // Try to get user's organizations
        const { data: userOrgs, error: orgsError } = await supabase
          .from('organization_members')
          .select('org_id')
          .eq('user_id', dbUserId);

        if (!orgsError && userOrgs && userOrgs.length > 0) {
          // User has organizations - filter by them
          const orgIds = userOrgs.map(o => o.org_id);
          
          // Get all users in the same organizations
          const { data: orgMembers, error: membersError } = await supabase
            .from('organization_members')
            .select('user_id')
            .in('org_id', orgIds);

          if (!membersError && orgMembers) {
            const memberUserIds = orgMembers.map(m => m.user_id);
            
            // Fetch profiles for those users
            const { data: orgProfiles, error: orgProfilesError } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', memberUserIds)
              .eq('opted_in', true);
            
            profiles = orgProfiles || [];
            profilesError = orgProfilesError;
          }
        } else {
          // No organizations found or table doesn't exist - fetch all opted-in profiles
          const { data: allProfiles, error: allProfilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('opted_in', true);
          
          profiles = allProfiles || [];
          profilesError = allProfilesError;
        }
      } catch (orgCheckError) {
        console.log('[Chat API] Organization filtering unavailable, fetching all profiles');
        // If organization tables don't exist yet, fall back to all profiles
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('profiles')
          .select('*')
          .eq('opted_in', true);
        
        profiles = allProfiles || [];
        profilesError = allProfilesError;
      }
    } else {
      // No authenticated user - fetch all opted-in profiles
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('opted_in', true);
      
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
      ms_program: profile.ms_program,
      background: profile.background,
      working_on: profile.working_on,
      interests: profile.interests,
      can_help_with: profile.expertise,
      seeking_help_with: profile.looking_for,
      available_for: profile.open_to,
      linkedin_url: profile.linkedin_url
    }));

    // Build user profile context if available
    let userContext = '';
    if (userProfile) {
      userContext = `CURRENT USER'S PROFILE (the person asking for matches):
Name: ${userProfile.name}
Background: ${userProfile.background}
Expertise: ${userProfile.expertise}
Looking for: ${JSON.stringify(userProfile.looking_for)}
Open to: ${JSON.stringify(userProfile.open_to)}

Use this to provide personalized matches that complement their skills, fill their gaps, and align with what they're looking for.
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
          
          // After streaming completes, store assistant message to database
          if (dbChatSessionId && dbUserId && fullResponse) {
            try {
              // Extract matched profiles from response for metadata
              const emailMatches = fullResponse.match(/📧\s+([^\n]+)/g);
              const matchedEmails = emailMatches ? emailMatches.map(m => m.replace('📧', '').trim()) : [];
              
              const metadata = {
                query_intent: message.substring(0, 200), // Store user's query
                matched_profiles: matchedEmails,
                response_length: fullResponse.length
              };

              await supabase
                .from('chat_messages')
                .insert({
                  chat_session_id: dbChatSessionId,
                  role: 'assistant',
                  content: fullResponse,
                  metadata: metadata,
                  created_at: new Date().toISOString()
                });

              // Update chat session's last_message_at
              await supabase
                .from('chat_sessions')
                .update({ last_message_at: new Date().toISOString() })
                .eq('chat_id', dbChatSessionId);
            } catch (dbError) {
              console.error('[Chat API] Error storing assistant message:', dbError);
              // Don't break the stream if DB fails
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            done: true,
            chatSessionId: dbChatSessionId // Return session ID to frontend
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