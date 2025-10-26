'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Send, User, Mail, Linkedin, Heart, X, ChevronRight, Search, Sparkles } from 'lucide-react';

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
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());
  const [conversationComplete, setConversationComplete] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
      content: "I match you with relevant collaborators based on what you're looking for. What kind of expertise, cofounder, or connection do you need?",
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
      content: "I match you with relevant collaborators based on what you're looking for. What kind of expertise, cofounder, or connection do you need?",
      timestamp: new Date()
    }]);
    setCurrentMatches([]);
    setSavedProfiles(new Set());
    setConversationComplete(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || conversationComplete) return;

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

      // Add a placeholder message for streaming
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        people: []
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
      
      // Create match cards with reasoning
      const matchCards: MatchCard[] = matchedPeople.map((profile, index) => ({
        profile,
        reasoning: profile.background,
        relevanceScore: 95 - (index * 5) // Mock relevance scores
      }));

      setCurrentMatches(matchCards);
      
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId ? { ...msg, content: finalContent, people: matchedPeople } : msg
        )
      );

      // Mark conversation as complete only if we found matches
      if (matchCards.length > 0) {
        setConversationComplete(true);
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !conversationComplete) {
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
    setCurrentMatches(prev => prev.filter(match => match.profile.id !== profileId));
  };

  // Don't render until authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <img 
                src="/mooring-logo.svg" 
                alt="Mooring" 
                className="w-16 h-12"
              />
              <span className="text-xl font-medium text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
            <div className="hidden md:block">
              <div className="flex items-center space-x-6">
                <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Home</Link>
                <Link href="/contact" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Contact</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Split View */}
      <div className="flex h-full">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col border-r border-gray-100">
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="max-w-2xl mx-auto space-y-8">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-5 h-5 text-[#DC2626]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-900'
                    } px-4 py-3 rounded-2xl`}
                  >
                    <div 
                      className="text-[15px] leading-relaxed"
                      style={{ lineHeight: '1.7' }}
                      dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                    />
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Sparkles className="w-5 h-5 text-[#DC2626] animate-pulse" />
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
          <div className="border-t border-gray-100 px-6 py-5">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-5 pr-14 py-3.5 text-sm placeholder-gray-400 text-gray-900 focus:bg-white focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-all duration-150"
                  placeholder="Ask what you're looking for..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || conversationComplete}
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#DC2626] disabled:opacity-30 transition-colors duration-150 p-1.5"
                  onClick={sendMessage}
                  disabled={isLoading || conversationComplete || !input.trim()}
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Matches Panel */}
        <div className="w-80 flex flex-col border-l border-gray-100 bg-gray-50/30">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Matches</h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {currentMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                  <Search className="w-12 h-12 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 max-w-xs">Start a conversation to see matches</p>
              </div>
            ) : (
              currentMatches.map((match) => (
                <div key={match.profile.id} className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#DC2626] to-[#EF4444] flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                      {match.profile.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{match.profile.name}</h3>
                      <p className="text-xs text-gray-500 mb-2">{match.profile.ms_program}</p>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">
                        {match.reasoning}
                      </p>
                      <div className="flex items-center gap-3">
                        {match.profile.email && (
                          <a href={`mailto:${match.profile.email}`} className="text-xs text-gray-500 hover:text-[#DC2626] transition-colors">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {match.profile.linkedin_url && (
                          <a
                            href={match.profile.linkedin_url.startsWith('http') ? match.profile.linkedin_url : `https://${match.profile.linkedin_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-[#DC2626] transition-colors"
                          >
                            <Linkedin className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleSaveProfile(match.profile)}
                          disabled={savedProfiles.has(match.profile.id)}
                          className={`ml-auto transition-colors ${
                            savedProfiles.has(match.profile.id)
                              ? 'text-green-600'
                              : 'text-gray-400 hover:text-[#DC2626]'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${savedProfiles.has(match.profile.id) ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}