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
      content: "Hi! I'm here to help you find collaborators in the Roux network. What kind of expertise or help are you looking for?",
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
      content: "Hi! I'm here to help you find collaborators in the Roux network. What kind of expertise or help are you looking for?",
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      {/* Navbar */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50 pt-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-20 items-center">
            <Link href="/" className="flex items-center -space-x-2">
              <img 
                src="/mooring-logo.svg" 
                alt="Mooring" 
                className="w-24 h-18"
              />
              <span className="text-3xl font-bold text-stone-900 -ml-4" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
            <div className="hidden md:block">
              <div className="flex items-center space-x-8">
                <Link href="/" className="text-base text-stone-600 hover:text-stone-900 transition-colors font-sans">Home</Link>
                <Link href="/contact" className="text-base text-stone-600 hover:text-stone-900 transition-colors font-sans">Contact</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10 pb-8 border-b border-gray-200">
          <h1 className="text-3xl font-semibold text-stone-900 mb-3" style={{ fontFamily: 'var(--font-ibm-plex)' }}>Find Collaborators</h1>
          <p className="text-base text-stone-500">Ask me what you're looking for</p>
        </div>

        <div className="grid grid-cols-2 gap-0" style={{ minHeight: 'calc(100vh - 300px)' }}>
          {/* Left: Chat */}
          <div className="bg-white rounded-l-2xl border border-gray-200 border-r-0 shadow-md flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0 bg-gray-50/20">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-xl shadow ${
                      message.role === 'user'
                        ? 'bg-gray-900 text-white shadow-gray-900/20'
                        : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                    }`}
                  >
                    <div 
                      className="text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                    />
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 px-4 py-3 rounded-xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 px-6 py-4 bg-white">
              <div className="flex space-x-3">
                <input
                  className="flex-1 border border-gray-300 bg-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm placeholder-gray-400 text-gray-900 transition-all"
                  placeholder={conversationComplete ? "Start a new chat" : "Ask about collaborators..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || conversationComplete}
                />
                <button
                  className="bg-teal-600 text-white px-5 py-2.5 rounded-xl hover:bg-teal-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  onClick={sendMessage}
                  disabled={isLoading || conversationComplete}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent"></div>

          {/* Right: Matches */}
          <div className="bg-white rounded-r-2xl border border-gray-200 border-l-0 shadow-md flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white">
              <h3 className="text-base font-semibold text-stone-900">Matches</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 min-h-0">
              {currentMatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 px-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                    <Search className="w-10 h-10 text-teal-600" />
                  </div>
                  <div className="text-center max-w-xs">
                    <p className="text-stone-900 font-semibold text-base mb-2">No matches yet</p>
                    <p className="text-stone-600 text-sm leading-relaxed">Start a conversation to see potential collaborators</p>
                    <p className="text-stone-500 text-xs mt-3 italic">I'll suggest relevant people from the Roux network based on your needs</p>
                  </div>
                </div>
              ) : (
                currentMatches.map((match) => (
                  <div key={match.profile.id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">{match.profile.name}</h3>
                    <p className="text-sm text-gray-600 font-medium">{match.profile.ms_program}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-semibold">
                      {match.relevanceScore}%
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">
                    <span className="font-semibold text-gray-900">Why relevant:</span> {match.reasoning}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {match.profile.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-3" />
                      <a href={`mailto:${match.profile.email}`} className="hover:text-gray-900 transition-colors font-medium">
                        {match.profile.email}
                      </a>
                    </div>
                  )}
                  {match.profile.linkedin_url && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Linkedin className="w-4 h-4 mr-3" />
                      <a
                        href={match.profile.linkedin_url.startsWith('http') ? match.profile.linkedin_url : `https://${match.profile.linkedin_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gray-900 transition-colors font-medium"
                      >
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => handleSaveProfile(match.profile)}
                    disabled={savedProfiles.has(match.profile.id)}
                    className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-sm ${
                      savedProfiles.has(match.profile.id)
                        ? 'bg-green-50 text-green-700 cursor-not-allowed'
                        : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-md'
                    }`}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    {savedProfiles.has(match.profile.id) ? 'Saved' : 'Save'}
                  </button>
                  <button
                    onClick={() => handlePassProfile(match.profile.id)}
                    className="px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}