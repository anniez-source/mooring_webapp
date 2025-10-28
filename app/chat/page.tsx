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
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'assistant',
    content: "I match you with relevant collaborators based on what you're looking for. What kind of expertise or connection do you need?",
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMatches, setCurrentMatches] = useState<MatchCard[]>([]);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  const [conversationComplete, setConversationComplete] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [matchesWidth, setMatchesWidth] = useState(384);
  const [isResizing, setIsResizing] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    background?: string;
    working_on?: string;
    expertise?: string;
    looking_for: Array<{ commitment: string; type: string }>;
    open_to: Array<{ commitment: string; type: string }>;
  } | null>(null);
  
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
    
    // Initialize welcome message and load saved profiles
    if (isSignedIn && user?.primaryEmailAddress) {
      // Load user profile
      const fetchUserProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, background, working_on, expertise, looking_for, open_to')
          .eq('email', user.primaryEmailAddress!.emailAddress)
          .single();
        
        if (data) {
          setUserProfile({
            name: data.name || '',
            background: data.background,
            working_on: data.working_on,
            expertise: data.expertise,
            looking_for: data.looking_for || [],
            open_to: data.open_to || []
          });
        }
      };

      fetchUserProfile();

      // Load saved profiles
      supabase
        .from('saved_collaborators')
        .select('saved_profile_id')
        .eq('user_id', user.id)
        .then(({ data }) => {
          if (data) {
            setSavedProfiles(new Set(data.map(item => item.saved_profile_id)));
          }
        });
    }
  }, [isLoaded, isSignedIn, user, router]);

  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = Math.max(300, Math.min(800, e.clientX));
        setMatchesWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

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

  const formatLookingForLabel = (type: string): string => {
    const labels: Record<string, string> = {
      // High commitment - looking for
      'technical_cofounder': 'Technical cofounder',
      'business_cofounder': 'Business cofounder',
      'domain_expert_cofounder': 'Domain expert cofounder',
      'founding_team_member': 'Founding team member',
      // Medium commitment - looking for
      'advisor': 'Advisor / mentor',
      'project_collaborator': 'Project collaborator',
      'receiving_paid_services': 'Receiving paid services',
      'beta_tester': 'Beta tester',
      // Low commitment - looking for
      'introduction': 'Introductions',
      'coffee_chats': 'Coffee chats / networking',
      'feedback': 'Feedback on idea / product',
      // Other
      'other': 'Other'
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  const determineSearchCommitmentLevel = (userQuery: string, aiResponse: string): 'low' | 'medium' | 'high' | undefined => {
    const lowerQuery = userQuery.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();
    
    // First check the AI's explicit categorization
    if (lowerResponse.includes('high commitment') || lowerResponse.includes('high-commitment')) return 'high';
    if (lowerResponse.includes('medium commitment') || lowerResponse.includes('medium-commitment')) return 'medium';
    if (lowerResponse.includes('low commitment') || lowerResponse.includes('low-commitment')) return 'low';
    
    // Check user's query for commitment keywords
    if (lowerQuery.match(/\b(cofounder|co-?founder|technical|business|team member|long-?term partner|join.{0,20}team|partner)\b/)) return 'high';
    if (lowerQuery.match(/\b(advisor|mentor|advising|mentoring|ongoing|project collaborat|regular help|service provider|beta test)\b/)) return 'medium';
    if (lowerQuery.match(/\b(introduction|intro|connect me|coffee|quick consultation|30 min|one-?time|advice|networking)\b/)) return 'low';
    
    return undefined;
  };

  const parseAssistantResponse = (rawContent: string): { text: string, people: Profile[] } => {
    // [Keep existing parseAssistantResponse implementation]
    let text = rawContent;
    const people: Profile[] = [];

    const personRegex = /\*\*?(\d+)\.\s*\*?\*?([^*\n]+?)\s*\*?\*?(?:\s*-\s*(.+?))?\s*Email:\s*([^\s]+)(?:\s+LinkedIn:\s*([^\n]+))?\s*Why relevant[.:]?\s*(.+?)(?=\n\*\*?\d+\.|Assessment:|Suggested approach:|---+|\n\n[A-Z]|$)/gi;
    
    let match;
    while ((match = personRegex.exec(rawContent)) !== null) {
      const [, , name, program, email, linkedin, relevance] = match;
      people.push({
        id: email.trim().toLowerCase(),
        name: name.trim().replace(/\*\*/g, ''),
        ms_program: program ? program.trim() : 'Member',
        email: email.trim(),
        linkedin_url: linkedin ? linkedin.trim() : '',
        background: relevance.trim(),
        working_on: '',
        interests: '',
        expertise: '',
        looking_for: [],
        open_to: []
      });
    }

    // Remove parsed person entries from text
    text = text.replace(personRegex, '');
    text = text.replace(/^I found .+?:\s*/i, '');
    text = text.replace(/---+/g, '');
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

    return { text, people };
  };

  // MAIN SEND MESSAGE FUNCTION - defined first so other functions can reference it
  const sendMessage = async (messageOverride?: string) => {
    const messageText = messageOverride || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageOverride) {
      setInput('');
    }
    setIsLoading(true);
    setDisplayIndex(0);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Check if query matches declared interests
      const matchesDeclaredInterest = userProfile?.looking_for?.some(item => {
        const typeLabel = formatLookingForLabel(item.type).toLowerCase();
        const queryLower = userMessage.content.toLowerCase();
        return queryLower.includes(typeLabel) || 
               queryLower.includes(item.type.replace(/_/g, ' '));
      });

      // If searching outside profile interests, add a subtle system note
      if (userProfile && !matchesDeclaredInterest && userProfile.looking_for.length > 0) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 0.5).toString(),
          role: 'assistant',
          content: "💡 Note: This search is outside your profile interests. I can still search, but matches might be one-way (they can help you, but may not need what you offer).",
          timestamp: new Date()
        }]);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
          chatSessionId: chatSessionId,
          userProfile: userProfile ? {
            name: userProfile.name,
            background: userProfile.background,
            working_on: userProfile.working_on,
            expertise: userProfile.expertise,
            looking_for: userProfile.looking_for,
            open_to: userProfile.open_to
          } : null
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

      // Add placeholder message immediately
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
            
            if (data.done && data.chatSessionId) {
              setChatSessionId(data.chatSessionId);
            }
            
            if (data.text) {
              receivedText += data.text;
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId ? { ...msg, content: receivedText } : msg
                )
              );
            }
          }
        }
      }

      // Parse and create match cards
      const { text: finalContent, people: matchedPeople } = parseAssistantResponse(receivedText);
      
      if (matchedPeople.length > 0) {
        const emails = matchedPeople.map(p => p.email);
        const { data: fullProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('email', emails);
        
        if (!profileError && fullProfiles) {
          const enrichedPeople = matchedPeople.map(parsedProfile => {
            const dbProfile = fullProfiles.find(fp => fp.email === parsedProfile.email);
            if (dbProfile) {
              return {
                ...parsedProfile,
                id: dbProfile.user_id,
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
          
          const searchCommitmentLevel = determineSearchCommitmentLevel(input, receivedText);
          
          const matchCards: MatchCard[] = enrichedPeople.map((profile, index) => {
            const reasoning = matchedPeople[index].background;
            return {
              profile,
              reasoning,
              relevanceScore: 95 - (index * 5),
              commitmentLevel: searchCommitmentLevel
            };
          });

          setCurrentMatches(matchCards);
          
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId ? { ...msg, content: finalContent, people: enrichedPeople } : msg
            )
          );
        }
      } else {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId ? { ...msg, content: finalContent, people: matchedPeople } : msg
          )
        );
      }

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

  const handleQuickSearch = (item: { commitment: string; type: string }) => {
    const query = `I'm looking for ${formatLookingForLabel(item.type).toLowerCase()}`;
    setInput(query);
    sendMessage(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSaveProfile = async (profile: Profile, reasoning: string) => {
    try {
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
        throw new Error(errorData.error || 'Failed to save contact');
      }

      setSavedProfiles(prev => new Set([...prev, profile.id]));
    } catch (error: any) {
      console.error('Error saving contact:', error);
      alert(error.message || 'Failed to save contact');
    }
  };

  const handleEmailClick = async (profileId: string) => {
    try {
      await fetch('/api/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId,
          actionType: 'email',
        }),
      });
    } catch (error) {
      console.error('Error tracking email click:', error);
    }
  };

  const handleLinkedInClick = async (profileId: string) => {
    try {
      await fetch('/api/track-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId,
          actionType: 'linkedin',
        }),
      });
    } catch (error) {
      console.error('Error tracking LinkedIn click:', error);
    }
  };

  const formatMessageContent = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
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
    setChatSessionId(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  const getCommitmentIcon = (level?: 'low' | 'medium' | 'high') => {
    if (level === 'high') return <Flame className="w-4 h-4 text-red-600" />;
    if (level === 'medium') return <Handshake className="w-4 h-4 text-red-600" />;
    if (level === 'low') return <Coffee className="w-4 h-4 text-red-600" />;
    return null;
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

          {/* User Profile Context Display */}
          {userProfile && userProfile.looking_for && userProfile.looking_for.length > 0 && messages.length === 1 && (
            <div className="border-t border-stone-200 px-8 py-4 bg-stone-50/60">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🤖</span>
                  <div className="flex-1">
                    <p className="font-medium text-stone-900 mb-2 text-sm">
                      Based on your profile, you're seeking:
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {userProfile.looking_for.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickSearch(item)}
                          className="px-3 py-1.5 bg-white border border-stone-300 rounded-full text-xs hover:bg-teal-50 hover:border-teal-500 transition-colors flex items-center gap-2"
                        >
                          <span>
                            {item.commitment === 'high' && <Flame className="w-3 h-3 inline text-red-600" />}
                            {item.commitment === 'medium' && <Handshake className="w-3 h-3 inline text-red-600" />}
                            {item.commitment === 'low' && <Coffee className="w-3 h-3 inline text-red-600" />}
                          </span>
                          <span className="text-stone-700">{formatLookingForLabel(item.type)}</span>
                        </button>
                      ))}
                    </div>
                    <div className="text-xs text-stone-500">
                      Click a button to search, or describe your specific need below. 
                      <Link href="/profile" className="text-teal-600 hover:underline ml-1">
                        Update your profile interests
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Empty Profile State */}
          {userProfile && (!userProfile.looking_for || userProfile.looking_for.length === 0) && messages.length === 1 && (
            <div className="border-t border-stone-200 px-8 py-4 bg-yellow-50/60">
              <div className="max-w-2xl mx-auto">
                <p className="text-sm text-yellow-800">
                  💡 You haven't set what you're looking for in your profile yet. 
                  <Link href="/profile" className="underline ml-1 font-medium">
                    Add your interests
                  </Link> 
                  {' '}for better matches.
                </p>
              </div>
            </div>
          )}

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
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Matches Panel */}
        <div 
          className="bg-white border-l border-stone-200/50 overflow-hidden flex flex-col relative" 
          style={{ width: `${matchesWidth}px`, minWidth: '300px', maxWidth: '800px' }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-500 transition-colors z-10"
            onMouseDown={handleMouseDown}
          />
          
          <div 
            className="flex-1 overflow-y-auto px-6 py-8"
            style={{
              backgroundImage: 'linear-gradient(rgba(13, 148, 136, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(13, 148, 136, 0.06) 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                Matches
              </h2>
              {currentMatches.length > 0 && (
                <button
                  onClick={startNewChat}
                  className="text-xs text-stone-600 hover:text-stone-900 px-3 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  New Search
                </button>
              )}
            </div>

            {currentMatches.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-stone-400" />
                </div>
                <p className="text-stone-600 text-sm mb-1">No matches yet</p>
                <p className="text-stone-400 text-xs">Start a search to find collaborators</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentMatches.slice(displayIndex, displayIndex + 3).map((matchCard) => (
                  <div
                    key={matchCard.profile.id}
                    className="border border-stone-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                          {matchCard.profile.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-stone-900 text-sm truncate">
                              {matchCard.profile.name}
                            </h3>
                            {getCommitmentIcon(matchCard.commitmentLevel)}
                          </div>
                          <p className="text-xs text-stone-500 mb-2">{matchCard.profile.ms_program}</p>
                          
                          {expandedMatchId === matchCard.profile.id ? (
                            <div className="space-y-3 text-xs">
                              <div>
                                <p className="font-medium text-stone-700 mb-1">Why relevant:</p>
                                <p className="text-stone-600 leading-relaxed">{matchCard.reasoning}</p>
                              </div>
                              
                              {matchCard.profile.background && (
                                <div>
                                  <p className="font-medium text-stone-700 mb-1">Background:</p>
                                  <p className="text-stone-600 leading-relaxed">{matchCard.profile.background}</p>
                                </div>
                              )}
                              
                              {matchCard.profile.working_on && (
                                <div>
                                  <p className="font-medium text-stone-700 mb-1">Currently working on:</p>
                                  <p className="text-stone-600 leading-relaxed">{matchCard.profile.working_on}</p>
                                </div>
                              )}
                              
                              {matchCard.profile.expertise && (
                                <div>
                                  <p className="font-medium text-stone-700 mb-1">Expertise:</p>
                                  <p className="text-stone-600 leading-relaxed">{matchCard.profile.expertise}</p>
                                </div>
                              )}
                              
                              <div className="flex gap-2 pt-2">
                                <a
                                  href={`mailto:${matchCard.profile.email}`}
                                  onClick={() => handleEmailClick(matchCard.profile.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs font-medium"
                                >
                                  <Mail className="w-3 h-3" />
                                  Email
                                </a>
                                {matchCard.profile.linkedin_url && (
                                  <a
                                    href={matchCard.profile.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => handleLinkedInClick(matchCard.profile.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-xs font-medium"
                                  >
                                    <Linkedin className="w-3 h-3" />
                                    LinkedIn
                                  </a>
                                )}
                              </div>

                              <button
                                onClick={() => setExpandedMatchId(null)}
                                className="text-teal-600 hover:text-teal-700 text-xs font-medium flex items-center gap-1"
                              >
                                Show less
                                <ChevronRight className="w-3 h-3 rotate-90" />
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs text-stone-600 mb-2 line-clamp-2 leading-relaxed">
                                {matchCard.reasoning}
                              </p>
                              <button
                                onClick={() => setExpandedMatchId(matchCard.profile.id)}
                                className="text-teal-600 hover:text-teal-700 text-xs font-medium flex items-center gap-1"
                              >
                                Show more
                                <ChevronRight className="w-3 h-3 -rotate-90" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleSaveProfile(matchCard.profile, matchCard.reasoning)}
                        disabled={savedProfiles.has(matchCard.profile.id)}
                        className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                          savedProfiles.has(matchCard.profile.id)
                            ? 'bg-red-50 text-red-600'
                            : 'hover:bg-stone-100 text-stone-400 hover:text-red-600'
                        }`}
                      >
                        <Heart 
                          className={`w-4 h-4 ${savedProfiles.has(matchCard.profile.id) ? 'fill-current' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                ))}

                {currentMatches.length > 3 && (
                  <div className="flex justify-between items-center pt-3 border-t border-stone-200">
                    <button
                      onClick={() => setDisplayIndex(Math.max(0, displayIndex - 3))}
                      disabled={displayIndex === 0}
                      className="text-sm text-teal-600 hover:text-teal-700 disabled:text-stone-300 disabled:cursor-not-allowed font-medium"
                    >
                      ← Previous
                    </button>
                    <span className="text-xs text-stone-500">
                      {Math.floor(displayIndex / 3) + 1} of {Math.ceil(currentMatches.length / 3)}
                    </span>
                    <button
                      onClick={() => setDisplayIndex(Math.min(currentMatches.length - 3, displayIndex + 3))}
                      disabled={displayIndex + 3 >= currentMatches.length}
                      className="text-sm text-teal-600 hover:text-teal-700 disabled:text-stone-300 disabled:cursor-not-allowed font-medium"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

