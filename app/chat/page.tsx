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
          userId: 'current_user_id',
          profileId: profile.id,
          source: 'chat',
          sourceDetail: messages[messages.length - 1]?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save collaborator');
      }

      setSavedProfiles(prev => new Set([...prev, profile.id]));
    } catch (error) {
      console.error('Error saving collaborator:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8">
      {/* Large Modal Container */}
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden backdrop-blur-sm relative">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Find Collaborators</h2>
            <p className="text-sm text-gray-500 mt-1">Ask me what you're looking for</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-2" style={{ height: '600px', maxHeight: 'calc(100vh - 200px)' }}>
          {/* Left: Chat */}
          <div className="border-r border-gray-100 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 min-h-0">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-xl ${
                      message.role === 'user'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-50 text-gray-800'
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
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex space-x-3">
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm placeholder-gray-400 text-gray-900"
                  placeholder={conversationComplete ? "Start a new chat" : "Ask about collaborators..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || conversationComplete}
                />
                <button
                  className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={sendMessage}
                  disabled={isLoading || conversationComplete}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Matches */}
          <div className="flex flex-col bg-gray-50/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">Matches</h3>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
              {currentMatches.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm font-medium">Start a conversation to see potential matches</p>
                </div>
              ) : (
                currentMatches.map((match) => (
                  <div key={match.profile.id} className="bg-white rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow">
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
                    className={`flex-1 flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      savedProfiles.has(match.profile.id)
                        ? 'bg-green-50 text-green-700 cursor-not-allowed'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    {savedProfiles.has(match.profile.id) ? 'Saved' : 'Save'}
                  </button>
                  <button
                    onClick={() => handlePassProfile(match.profile.id)}
                    className="px-4 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
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