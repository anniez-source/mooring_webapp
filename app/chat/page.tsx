'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Send, User, Mail, Linkedin, Heart, X, ChevronRight, Search } from 'lucide-react';

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
  can_help_with: string;
  seeking_help_with: string;
  available_for: string[];
}

interface MatchCard {
  profile: Profile;
  reasoning: string;
  relevanceScore: number;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMatches, setCurrentMatches] = useState<MatchCard[]>([]);
  const [displayIndex, setDisplayIndex] = useState(0); // Track which 3 matches to show
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  const [conversationComplete, setConversationComplete] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [matchesWidth, setMatchesWidth] = useState(384); // Default width in px (w-96)
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check authentication
    const user = localStorage.getItem('mooring_user');
    if (!user) {
      router.push('/login');
      return;
    }
    setIsAuthenticated(true);
    
      // Add welcome message
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "I match you with relevant collaborators based on what you're looking for. What kind of expertise or connection do you need?",
        timestamp: new Date()
      }]);
  }, [router]);

  const formatMessageContent = (content: string) => {
    // Convert markdown-style formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold text
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic text
      .replace(/\n/g, '<br>'); // Line breaks
  };

  const parseAssistantResponse = (rawContent: string): { text: string; people: Profile[] } => {
    const people: Profile[] = [];
    let text = rawContent;

    // Regex to find person blocks
    const personRegex = /\*\*([^*]+)\*\* - ([^\n]+)\n📧 ([^\n]+)\n💼 ([^\n]+)\n\nWhy relevant: ([^]+?)(?=\*\*|$)/g;
    let match;
    let lastIndex = 0;

    while ((match = personRegex.exec(rawContent)) !== null) {
      const [fullMatch, name, ms_program, email, linkedin_url, reasoning] = match;

      // Create a dummy profile for display
      const dummyProfile: Profile = {
        id: `temp-${name.replace(/\s/g, '-')}`,
        name: name.trim(),
        ms_program: ms_program.trim(),
        email: email.trim(),
        linkedin_url: linkedin_url.trim() === 'No LinkedIn provided' ? '' : linkedin_url.trim(),
        background: reasoning.trim(),
        working_on: '',
        interests: '',
        can_help_with: '',
        seeking_help_with: '',
        available_for: [],
      };
      people.push(dummyProfile);

      // Remove the person block from the text content
      text = text.replace(fullMatch, '');
    }

    // Clean up any extra newlines or spaces left from removing blocks
    text = text.replace(/\n\s*\n/g, '\n\n').trim();

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
          conversationHistory
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
      const { text: finalContent, people: matchedPeople } = parseAssistantResponse(receivedText);
      
      console.log('Number of matched people:', matchedPeople.length);
      
      // Create match cards with reasoning
      const matchCards: MatchCard[] = matchedPeople.map((profile, index) => ({
        profile,
        reasoning: profile.background,
        relevanceScore: 95 - (index * 5) // Mock relevance scores
      }));

      console.log('Match cards created:', matchCards.length);
      setCurrentMatches(matchCards);
      
      // Update message with final content and people (for any matched profiles)
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId ? { ...msg, content: finalContent, people: matchedPeople } : msg
        )
      );

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

  const handleSaveProfile = async (profile: Profile) => {
    try {
      const response = await fetch('/api/save-collaborator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profileId: profile.id,
          source: 'chat',
          sourceDetail: messages[messages.length - 1]?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save collaborator');
      }

      setSavedProfiles(prev => new Set([...prev, profile.id]));
    } catch (error: any) {
      console.error('Error saving collaborator:', error);
      alert(error.message || 'Failed to save collaborator');
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
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/communities" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Communities</Link>
              <Link href="/chat" className="text-sm text-gray-900 font-medium">Find People</Link>
              <Link href="/saved" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Saved</Link>
              <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Profile</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Split View */}
      <div className="flex flex-1 border-t border-[#F1F3F5] min-h-0">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col border-r border-gray-100 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-6" style={{ minHeight: 0 }}>
            <div className="max-w-2xl mx-auto space-y-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1 p-1.5">
                      <img src="/mooring-logo.svg" alt="Mooring" className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-gray-900 text-white'
                        : 'bg-[#F9FAFB] text-gray-900'
                    } px-4 py-3 rounded-2xl`}
                  >
                    <div 
                      className="text-[15px] leading-relaxed"
                      style={{ lineHeight: '1.6' }}
                      dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                    />
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1 p-1.5">
                    <img src="/mooring-logo.svg" alt="Mooring" className="w-full h-full object-contain animate-pulse" />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 px-6 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-5 pr-14 py-4 text-sm placeholder-gray-400 text-gray-800 focus:border-gray-300 transition-all duration-200 shadow-sm"
                  placeholder="Ask what you're looking for..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                />
                <button
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 transition-all duration-150 ${
                    input.trim() 
                      ? 'text-[#DC2626] hover:text-[#EF4444] hover:opacity-70' 
                      : 'text-gray-300'
                  }`}
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Matches Panel */}
        <div className="flex flex-col border-l border-gray-100 bg-white relative min-h-0" style={{ width: `${matchesWidth}px` }}>
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
          <div className="px-8 py-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/30">
            <h3 className="text-lg font-medium text-gray-900 tracking-normal" style={{ fontFamily: 'var(--font-ibm-plex)' }}>Matches</h3>
          </div>
          <div 
            className="flex-1 overflow-y-auto px-6 py-6"
            style={{
              backgroundImage: 'linear-gradient(rgba(13, 148, 136, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(13, 148, 136, 0.08) 1px, transparent 1px)',
              backgroundSize: '30px 30px'
            }}
          >
            {currentMatches.length === 0 ? null : (
              currentMatches.slice(displayIndex, displayIndex + 3).map((match, localIndex) => {
                const isExpanded = expandedMatchId === match.profile.id;
                return (
                  <div key={match.profile.id} className="mb-4 p-4 bg-white rounded-lg border border-gray-200 relative hover:shadow-sm transition-shadow cursor-pointer pr-16" onClick={() => setExpandedMatchId(isExpanded ? null : match.profile.id)}>
                    {/* Action icons group - top right (shown when expanded) */}
                    {isExpanded && (
                      <div className="absolute top-2 right-8 flex items-center gap-2 z-20">
                        {match.profile.email && (
                          <a href={`mailto:${match.profile.email}`} className="text-gray-400 hover:text-[#DC2626] transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        {match.profile.linkedin_url && (
                          <a
                            href={match.profile.linkedin_url.startsWith('http') ? match.profile.linkedin_url : `https://${match.profile.linkedin_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-[#DC2626] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Linkedin className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveProfile(match.profile);
                          }}
                          disabled={savedProfiles.has(match.profile.id)}
                          className={`transition-colors ${
                            savedProfiles.has(match.profile.id)
                              ? 'text-green-600'
                              : 'text-gray-400 hover:text-[#DC2626]'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${savedProfiles.has(match.profile.id) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    )}
                    
                    {/* Dismiss button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const actualIndex = displayIndex + localIndex;
                        // Pass the current index rather than profile ID
                        handlePassProfile(currentMatches[actualIndex].profile.id);
                      }}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors z-20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    {/* Content - full width */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#DC2626] to-[#EF4444] flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                        {match.profile.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{match.profile.name}</h3>
                        <p className="text-xs text-gray-500 mb-2">{match.profile.ms_program}</p>
                        {isExpanded ? (
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {match.reasoning}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                            {match.reasoning}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}