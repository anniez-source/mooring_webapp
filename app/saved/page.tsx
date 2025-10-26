'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { 
  Linkedin, 
  Mail, 
  MessageCircle, 
  X, 
  User, 
  Calendar,
  ArrowLeft,
  Heart
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SavedContact {
  id: string;
  name: string;
  bio: string;
  photo_url: string;
  linkedin_url: string;
  email: string;
  slack_id?: string;
  why_saved: string;
  saved_at: string;
  profile_id: string;
}

export default function SavedContactsPage() {
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedContacts();
  }, []);

  const fetchSavedContacts = async () => {
    try {
      // For now, use a placeholder user ID - in a real app, this would come from auth
      const userId = 'current_user_id';
      
      const { data, error } = await supabase
        .from('saved_contacts')
        .select(`
          *,
          profiles (
            name,
            ms_program,
            email,
            linkedin_url,
            background,
            working_on
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Suppress errors about missing table - this is expected during development
      if (error && !error.message.includes("saved_contacts")) {
        // Only log unexpected errors
        console.error('Unexpected error:', error);
      }

      if (data && data.length > 0) {
        // Transform the data to match our interface
        const transformedContacts: SavedContact[] = data.map((item: any) => ({
          id: item.id,
          name: item.profiles.name,
          bio: `${item.profiles.ms_program} - ${item.profiles.background}`,
          photo_url: '', // No photo URLs in current schema
          linkedin_url: item.profiles.linkedin_url || '',
          email: item.profiles.email,
          slack_id: undefined, // No Slack IDs in current schema
          why_saved: item.reason || 'Saved from search results',
          saved_at: item.created_at,
          profile_id: item.profile_id
        }));
        
        setContacts(transformedContacts);
      } else {
        // No data, show empty state
        setContacts([]);
      }
    } catch (error) {
      console.error('Error fetching saved contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const removeContact = (contactId: string) => {
    // Remove from local state only for now
    // TODO: Add database deletion once saved_contacts table is created
    setContacts(prev => prev.filter(contact => contact.id !== contactId));
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8">
            <Link 
              href="/chat" 
              className="group flex items-center gap-3 text-stone-500 hover:text-stone-800 transition-all duration-200"
            >
              <div className="p-1 rounded-lg bg-white/50 group-hover:bg-white/80 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold tracking-wide">Back to Search</span>
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold text-stone-900 mb-3 tracking-tight">
                Saved Contacts
              </h1>
              <p className="text-xl text-stone-600 font-medium">
                {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} saved
              </p>
            </div>
            
            <div className="flex items-center gap-3 px-6 py-3 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-sm">
              <div className="p-2 bg-teal-100 rounded-xl">
                <Heart className="w-5 h-5 text-teal-600" />
              </div>
              <span className="text-sm font-semibold text-stone-700 tracking-wide">Your Network</span>
            </div>
          </div>
        </div>

        {/* Contacts Grid */}
        {contacts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {contacts.map((contact) => (
              <div 
                key={contact.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/40 p-8 hover:bg-white hover:shadow-2xl hover:shadow-stone-200/50 transition-all duration-300 group hover:-translate-y-1"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 bg-gradient-to-br from-stone-100 to-stone-200 rounded-2xl flex items-center justify-center shadow-sm">
                      {contact.photo_url ? (
                        <img 
                          src={contact.photo_url} 
                          alt={contact.name}
                          className="w-20 h-20 rounded-2xl object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-stone-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-stone-900 mb-2 tracking-tight">
                        {contact.name}
                      </h3>
                      <p className="text-sm text-stone-600 mb-3 font-medium leading-relaxed">
                        {contact.bio}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>Saved {formatTimeAgo(contact.saved_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeContact(contact.id)}
                    className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Why Saved */}
                <div className="mb-8">
                  <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-100">
                    <p className="text-sm text-stone-600 font-medium leading-relaxed">
                      "{contact.why_saved}"
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {contact.linkedin_url && (
                    <a
                      href={contact.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-teal-600 text-teal-600 rounded-xl hover:bg-teal-600 hover:text-white transition-all duration-200 text-sm font-semibold tracking-wide hover:shadow-lg hover:shadow-teal-200/50"
                    >
                      <Linkedin className="w-4 h-4" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-teal-600 text-teal-600 rounded-lg hover:bg-teal-600 hover:text-white transition-all duration-200 text-sm font-medium"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </a>
                  
                  {contact.slack_id && (
                    <a
                      href={`slack://user?team=T1234567890&id=${contact.slack_id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-teal-600 text-teal-600 rounded-xl hover:bg-teal-600 hover:text-white transition-all duration-200 text-sm font-semibold tracking-wide hover:shadow-lg hover:shadow-teal-200/50"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Slack</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-24">
            <div className="w-32 h-32 bg-gradient-to-br from-stone-100 to-stone-200 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
              <Heart className="w-16 h-16 text-stone-500" />
            </div>
            <h2 className="text-4xl font-bold text-stone-900 mb-6 tracking-tight">
              No contacts saved yet
            </h2>
            <p className="text-xl text-stone-600 mb-12 max-w-lg mx-auto leading-relaxed font-medium">
              Start searching for collaborators and save the ones that interest you. 
              Your saved contacts will appear here.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-3 px-8 py-4 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-all duration-200 font-semibold text-lg tracking-wide shadow-lg hover:shadow-xl hover:shadow-teal-200/50 hover:-translate-y-0.5"
            >
              <User className="w-6 h-6" />
              <span>Find Collaborators</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
