'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { useUser, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Send, User, Mail, Linkedin, Heart, X, ChevronRight, Search, Coffee, Flame, Handshake } from 'lucide-react';
import CompleteProfileModal from '../components/CompleteProfileModal';
import UserProfileDropdown from '../components/UserProfileDropdown';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  people?: Profile[];
}

interface Profile {
  id: string;
  name: string;
  ms_program: string;
  email: string;
  linkedin_url: string;
  background: string;
  working_on: string;
  interests: string;
  expertise: string;
  looking_for: any[];
  open_to: any[];
}

interface MatchCard {
  profile: Profile;
  reasoning: string;
  relevanceScore: number;
  commitmentLevel?: 'low' | 'medium' | 'high';
}

export default function ChatPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMatches, setCurrentMatches] = useState<MatchCard[]>([]);
  const [displayIndex, setDisplayIndex] = useState(0); // Track which 3 matches to show
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  const [conversationComplete, setConversationComplete] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [matchesWidth, setMatchesWidth] = useState(384); // Default width in px (w-96)
  const [isResizing, setIsResizing] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check authentication with Clerk
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
      return;
    }
    
    // Sync user to Supabase when they log in
    async function syncUser() {
      if (!isSignedIn || !user) {
        console.log('[Chat] User not signed in');
        return;
      }
      
      console.log('[Chat] Syncing user:', user.id);
      
      try {
        // Check if user exists in users table
        const { data: existingUser, error: userFetchError} = await supabase
          .from('users')
          .select('user_id')
          .eq('clerk_user_id', user.id)
          .maybeSingle();
        
        if (userFetchError) {
          console.error('[Chat] Error fetching user:', userFetchError);
          return;
        }
        
        // If user doesn't exist in users table, create them
        if (!existingUser) {
          console.log('[Chat] User not found, creating new user record');
          const { data: newUser, error: userInsertError } = await supabase
            .from('users')
            .insert({
              clerk_user_id: user.id,
              email: user.emailAddresses[0]?.emailAddress || '',
              name: user.fullName || user.firstName || 'User'
            })
            .select('user_id')
            .single();
          
          if (userInsertError) {
            // Note: This error often occurs due to RLS policies blocking .select() after .insert()
            // The INSERT usually succeeds, but we can't read it back immediately
            // Run fix_users_table_permissions.sql to resolve this
            
            if (userInsertError.code === '23505') {
              console.log('[Chat] User already exists (duplicate key)');
            } else {
              console.log('[Chat] User insert completed (SELECT blocked by RLS - this is OK, user was created)');
              console.log('[Chat] To fix: Run fix_users_table_permissions.sql in Supabase');
            }
          } else {
            console.log('[Chat] User created successfully:', newUser?.user_id);
          }
        } else {
          console.log('[Chat] User already exists:', existingUser.user_id);
        }
        
        // OnboardingModal will handle profile completion check
      } catch (error) {
        console.error('[Chat] Error syncing user:', error);
      }
    }
    
    if (isSignedIn && user) {
      syncUser();
    }
    
    if (isSignedIn && messages.length === 0) {
      // Add welcome message only once
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "I match you with relevant collaborators based on what you're looking for. What kind of expertise or connection do you need?",
        timestamp: new Date()
      }]);
    }
  }, [router, isLoaded, isSignedIn, messages.length, user]);

  const formatMessageContent = (content: string) => {
    // Convert markdown-style formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-stone-900">$1</strong>') // Bold text with color
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/\n/g, '<br>'); // Line breaks
  };

  // Helper function to determine commitment level from the user's search query and AI's assessment
  const determineSearchCommitmentLevel = (userQuery: string, aiResponse: string): 'low' | 'medium' | 'high' | undefined => {
    const lowerQuery = userQuery.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();
    
    console.log('=== DETERMINING COMMITMENT LEVEL ===');
    console.log('User query:', userQuery);
    console.log('AI response (first 200 chars):', aiResponse.substring(0, 200));
    
    // First check the AI's explicit categorization (most reliable)
    if (lowerResponse.includes('high commitment') || lowerResponse.includes('high-commitment')) {
      console.log('Found HIGH commitment in AI response');
      return 'high';
    }
    if (lowerResponse.includes('medium commitment') || lowerResponse.includes('medium-commitment')) {
      console.log('Found MEDIUM commitment in AI response');
      return 'medium';
    }
    if (lowerResponse.includes('low commitment') || lowerResponse.includes('low-commitment')) {
      console.log('Found LOW commitment in AI response');
      return 'low';
    }
    
    // Then check user's query for commitment keywords
    // High commitment indicators
    if (lowerQuery.match(/\b(cofounder|co-?founder|technical|business|team member|long-?term partner|join.{0,20}team|partner)\b/)) {
      console.log('Matched HIGH commitment keywords in query');
      return 'high';
    }
    
    // Medium commitment indicators
    if (lowerQuery.match(/\b(advisor|mentor|advising|mentoring|ongoing|project collaborat|regular help|service provider|beta test)\b/)) {
      console.log('Matched MEDIUM commitment keywords in query');
      return 'medium';
    }
    
    // Low commitment indicators
    if (lowerQuery.match(/\b(introduction|intro|connect me|coffee|quick consultation|30 min|one-?time|advice|networking)\b/)) {
      console.log('Matched LOW commitment keywords in query');
      return 'low';
    }
    
    console.log('Could not determine commitment level - returning undefined');
    return undefined;
  };

  const parseAssistantResponse = (rawContent: string): { text: string; people: Profile[] } => {
    const people: Profile[] = [];
    let text = rawContent;

    // More flexible regex to handle various AI response formats:
    // Format 1: **Name** - Program\n📧 email\n💼 linkedin\n\nWhy relevant: ...
    // Format 2: Name\n📧 email\n💼 linkedin\n\nWhy relevant: ... (no bold, no program)
    // Format 3: **Name**\n📧 email\n💼 linkedin\n\nWhy relevant: ... (bold but no program)
    
    // Updated regex that stops at the next person entry or section dividers
    const personRegex = /(?:\*\*)?([A-Z][^\n*]+?)(?:\*\*)?(?: - ([^\n]+))?\n📧\s*([^\n]+)\n💼\s*([^\n]+)\n\nWhy relevant[.:]?\s*([^]+?)(?=\n\n(?:\*\*?[A-Z]|Assessment|Suggested approach|$)|$)/gi;
    let match;

    console.log('=== Parsing AI Response ===');
    console.log('Full response to parse:', rawContent);

    while ((match = personRegex.exec(rawContent)) !== null) {
      const [fullMatch, name, ms_program, email, linkedin_url, reasoning] = match;
      
      console.log('Found person:', {
        name: name.trim(),
        email: email.trim(),
        program: ms_program ? ms_program.trim() : 'Member'
      });

      // Create a dummy profile for display
      const dummyProfile: Profile = {
        id: `temp-${name.replace(/\s/g, '-')}`,
        name: name.trim(),
        ms_program: ms_program ? ms_program.trim() : 'Member', // Default if no program provided
        email: email.trim(),
        linkedin_url: linkedin_url.trim() === 'No LinkedIn provided' ? '' : linkedin_url.trim(),
        background: reasoning.trim(),
        working_on: '',
        interests: '',
        expertise: '',
        looking_for: [],
        open_to: [],
      };
      people.push(dummyProfile);

      // Remove the person block from the text content
      text = text.replace(fullMatch, '');
    }

    console.log(`Total people parsed: ${people.length}`);

    // Remove intro lines like "I found X people..." and "---" separators
    text = text.replace(/^I found .+?:\s*/i, ''); // Remove intro line
    text = text.replace(/---+/g, ''); // Remove all --- separators
    
    // Clean up any extra newlines or spaces left from removing blocks
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

    return { text, people };
  };

    const startNewChat = () => {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "I match you with relevant collaborators based on what you're looking for. What kind of expertise or connection do you need?",
        timestamp: new Date()
      }]);
      setCurrentMatches([]);
      setDisplayIndex(0);
      setSavedProfiles(new Set());
      setConversationComplete(false);
      setChatSessionId(null); // Reset session ID for new conversation
    };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentMatches([]); // Clear previous matches
    setDisplayIndex(0); // Reset to start

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
          chatSessionId: chatSessionId // Send session ID to API
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get reader for stream');

      let receivedText = '';
      let assistantMessageId = (Date.now() + 1).toString();

      // Add placeholder message immediately for better UX
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            
            // Capture the real session ID when streaming completes
            if (data.done && data.chatSessionId) {
              console.log('[Chat] Received chat session ID from API:', data.chatSessionId);
              setChatSessionId(data.chatSessionId);
            }
            
            if (data.text) {
              receivedText += data.text;
              // Update the message in real-time
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId ? { ...msg, content: receivedText } : msg
                )
              );
            }
          }
        }
      }

      // After streaming is complete, parse the full content and update the message
      console.log('=== PARSING AI RESPONSE ===');
      console.log('Full AI response:', receivedText);
      const { text: finalContent, people: matchedPeople } = parseAssistantResponse(receivedText);
      
      console.log('Number of matched people:', matchedPeople.length);
      console.log('Matched people:', matchedPeople);
      
      // Fetch full profile data from database to get real user_ids
      if (matchedPeople.length > 0) {
        const emails = matchedPeople.map(p => p.email);
        const { data: fullProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('email', emails);
        
        if (!profileError && fullProfiles) {
          // Match AI results with database profiles by email
          const enrichedPeople = matchedPeople.map(parsedProfile => {
            const dbProfile = fullProfiles.find(fp => fp.email === parsedProfile.email);
            if (dbProfile) {
              return {
                ...parsedProfile,
                id: dbProfile.user_id, // Use real user_id from database
                background: dbProfile.background,
                expertise: dbProfile.expertise,
                working_on: dbProfile.working_on || '',
                interests: dbProfile.interests || '',
                looking_for: dbProfile.looking_for || [],
                open_to: dbProfile.open_to || []
              };
            }
            return parsedProfile;
          });
          
          // Determine the commitment level for this search (applies to all matches)
          const searchCommitmentLevel = determineSearchCommitmentLevel(input, receivedText);
          console.log(`Search commitment level for query "${input}": ${searchCommitmentLevel}`);
          
          // Create match cards with reasoning from AI
          const matchCards: MatchCard[] = enrichedPeople.map((profile, index) => {
            const reasoning = matchedPeople[index].background; // Use AI's reasoning from parsed response
            return {
              profile,
              reasoning,
              relevanceScore: 95 - (index * 5),
              commitmentLevel: searchCommitmentLevel // Use the search-level commitment
            };
          });

          console.log('Match cards created:', matchCards.length);
          console.log('Match cards with commitment:', matchCards.map(m => ({ name: m.profile.name, level: m.commitmentLevel })));
          setCurrentMatches(matchCards);
          
          // Update message with enriched profiles
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId ? { ...msg, content: finalContent, people: enrichedPeople } : msg
            )
          );
        } else {
          // Fallback if database fetch fails
          const searchCommitmentLevel = determineSearchCommitmentLevel(input, receivedText);
          const matchCards: MatchCard[] = matchedPeople.map((profile, index) => {
            return {
              profile,
              reasoning: profile.background,
              relevanceScore: 95 - (index * 5),
              commitmentLevel: searchCommitmentLevel
            };
          });
          setCurrentMatches(matchCards);
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId ? { ...msg, content: finalContent, people: matchedPeople } : msg
            )
          );
        }
      } else {
        // No people matched
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId ? { ...msg, content: finalContent, people: matchedPeople } : msg
          )
        );
      }

      // Don't mark as complete - allow users to keep searching

    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSaveProfile = async (profile: Profile, reasoning: string) => {
    try {
      console.log('Saving profile:', { id: profile.id, name: profile.name, email: profile.email, sessionId: chatSessionId });
      
      const response = await fetch('/api/save-collaborator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          savedProfileId: profile.id,
          reason: reasoning,
          chatSessionId: chatSessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Save failed:', errorData);
        throw new Error(errorData.error || 'Failed to save contact');
      }

      const result = await response.json();
      console.log('Save successful:', result);
      setSavedProfiles(prev => new Set([...prev, profile.id]));
    } catch (error: any) {
      console.error('Error saving contact:', error);
      alert(error.message || 'Failed to save contact');
    }
  };

  const handleEmailClick = async (profileId: string) => {
    try {
      // Track email click in database
      await fetch('/api/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          savedProfileId: profileId,
          clickType: 'email',
        }),
      });
    } catch (error) {
      console.error('Error tracking email click:', error);
      // Don't block the user's action if tracking fails
    }
  };

  const handleLinkedInClick = async (profileId: string) => {
    try {
      // Track LinkedIn click in database
      await fetch('/api/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          savedProfileId: profileId,
          clickType: 'linkedin',
        }),
      });
    } catch (error) {
      console.error('Error tracking LinkedIn click:', error);
      // Don't block the user's action if tracking fails
    }
  };

  const handlePassProfile = (profileId: string) => {
    // Instead of removing, just advance to show next match
    // Advance to the next available match in the slice
    setDisplayIndex(prev => {
      // Allow advancing even if it means showing fewer than 3 matches
      // This lets users see all matches including the last ones
      const nextIndex = prev + 1;
      // Only prevent if we'd go completely beyond the array
      return nextIndex <= currentMatches.length ? nextIndex : prev;
    });
    setExpandedMatchId(null); // Close any expanded cards
  };

  // Resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        e.preventDefault(); // Prevent text selection
        const newWidth = window.innerWidth - e.clientX;
        // Constrain between 300px and 600px
        if (newWidth >= 300 && newWidth <= 600) {
          setMatchesWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  // Don't render until authenticated
  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <p className="text-stone-600">Loading...</p>
      </div>
    );
  }
  
  if (!isSignedIn) {
    router.push('/sign-in');
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <p className="text-stone-600">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <>
      <CompleteProfileModal />
      <div className="h-screen flex flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        {/* Navbar */}
        <nav className="bg-white/60 backdrop-blur-sm border-b border-white/20 relative z-50">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <img src="/mooring-logo.svg" alt="Mooring" className="w-6 h-6" />
              <span className="text-2xl font-bold text-stone-900 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/communities" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Communities</Link>
              <Link href="/chat" className="text-sm text-stone-900 font-medium">Find People</Link>
              <Link href="/saved" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Saved</Link>
              <Link href="/profile" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Profile</Link>
              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Split View */}
      <div className="flex flex-1 border-t border-stone-200/50 min-h-0">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col border-r border-stone-200/50 bg-white min-h-0">
          <div className="flex-1 overflow-y-auto px-8 py-8" style={{ minHeight: 0 }}>
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 mt-1 p-1.5">
                      <img src="/mooring-logo.svg" alt="Mooring" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] ${
                      message.role === 'user'
                        ? 'bg-stone-800 text-white'
                        : 'bg-white border border-stone-200 text-stone-900'
                    } px-5 py-3.5 rounded-xl`}
                    style={{ boxShadow: message.role === 'assistant' ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none' }}
                  >
                    <div 
                      className="text-sm leading-relaxed"
                      style={{ lineHeight: '1.7' }}
                      dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                    />
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 mt-1 p-1.5">
                    <img src="/mooring-logo.svg" alt="Mooring" className="w-full h-full object-contain animate-pulse" />
                  </div>
                  <div className="flex gap-1.5 items-center mt-2">
                    <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-stone-200 px-8 py-5 bg-white/60">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  className="w-full bg-white border border-stone-200 rounded-xl pl-4 pr-12 py-3.5 text-sm placeholder-stone-400 text-stone-800 focus:outline-none focus:border-teal-600 focus:ring-0 transition-colors"
                  style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
                  placeholder="Ask what you're looking for..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                />
                <button
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 transition-all duration-150 rounded-lg ${
                    input.trim() 
                      ? 'text-teal-600 hover:bg-teal-50' 
                      : 'text-stone-300'
                  }`}
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Matches Panel */}
        <div className="flex flex-col border-l border-stone-200/50 bg-white relative min-h-0" style={{ width: `${matchesWidth}px` }}>
          {/* Resize handle */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-600 z-20 transition-colors select-none"
            onMouseDown={handleMouseDown}
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <div className="absolute left-1/2 top-[40%] -translate-x-1/2 z-30 pointer-events-none select-none">
              <div className="flex items-center select-none">
                <ChevronRight className="w-10 h-10 text-teal-600 cursor-col-resize pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="px-6 py-5 border-b border-stone-200 bg-white/80">
            <h3 className="text-base font-semibold text-stone-900" style={{ fontFamily: 'var(--font-ibm-plex)', fontWeight: 600 }}>Matches</h3>
          </div>
          <div 
            className="flex-1 overflow-y-auto px-6 py-6"
            style={{
              backgroundImage: 'linear-gradient(rgba(13, 148, 136, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(13, 148, 136, 0.06) 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          >
            {currentMatches.length === 0 ? null : (
              displayIndex >= currentMatches.length ? (
                <div className="flex items-center justify-center h-full -mt-12">
                  <div className="text-center space-y-4">
                    <p className="text-sm font-medium text-stone-500">No more matches</p>
                    <p className="text-xs text-stone-400">Try refining your search to see more results</p>
                  </div>
                </div>
              ) : (
                currentMatches.slice(displayIndex, displayIndex + 3).map((match, localIndex) => {
                const isExpanded = expandedMatchId === match.profile.id;
                return (
                  <div key={match.profile.id} className="mb-4 p-4 bg-white rounded-xl border border-stone-200 relative hover:border-stone-300 transition-all cursor-pointer" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }} onClick={() => setExpandedMatchId(isExpanded ? null : match.profile.id)}>
                    {/* Dismiss button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const actualIndex = displayIndex + localIndex;
                        handlePassProfile(currentMatches[actualIndex].profile.id);
                      }}
                      className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 transition-colors z-20 p-1 hover:bg-stone-100 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Content */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                        {match.profile.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-stone-900 text-sm">{match.profile.name}</h3>
                          {match.commitmentLevel && (
                            <span title={`${match.commitmentLevel} commitment`}>
                              {match.commitmentLevel === 'low' && <Coffee className="w-4 h-4 text-red-600" />}
                              {match.commitmentLevel === 'medium' && <Handshake className="w-4 h-4 text-red-600" />}
                              {match.commitmentLevel === 'high' && <Flame className="w-4 h-4 text-red-600" />}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mb-2.5">{match.profile.ms_program}</p>
                        {isExpanded ? (
                          <p className="text-sm text-stone-700 leading-relaxed" style={{ lineHeight: '1.6' }}>
                            {match.reasoning}
                          </p>
                        ) : (
                          <p className="text-sm text-stone-700 leading-relaxed line-clamp-2" style={{ lineHeight: '1.6' }}>
                            {match.reasoning}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons - shown when expanded */}
                    {isExpanded && (
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                        {match.profile.email && (
                          <a 
                            href={`mailto:${match.profile.email}`} 
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 hover:text-teal-600 hover:bg-teal-50 transition-colors rounded-lg border border-stone-200 hover:border-teal-200" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmailClick(match.profile.id);
                            }}
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span className="font-medium">Email</span>
                          </a>
                        )}
                        {match.profile.linkedin_url && (
                          <a
                            href={match.profile.linkedin_url.startsWith('http') ? match.profile.linkedin_url : `https://${match.profile.linkedin_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-600 hover:text-teal-600 hover:bg-teal-50 transition-colors rounded-lg border border-stone-200 hover:border-teal-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLinkedInClick(match.profile.id);
                            }}
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                            <span className="font-medium">LinkedIn</span>
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveProfile(match.profile, match.reasoning);
                          }}
                          disabled={savedProfiles.has(match.profile.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                            savedProfiles.has(match.profile.id)
                              ? 'text-green-600 bg-green-50 border-green-200'
                              : 'text-stone-600 border-stone-200 hover:text-teal-600 hover:bg-teal-50 hover:border-teal-200'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${savedProfiles.has(match.profile.id) ? 'fill-current' : ''}`} />
                          <span className="font-medium">{savedProfiles.has(match.profile.id) ? 'Saved' : 'Save'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
              )
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}