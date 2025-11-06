'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import UserProfileDropdown from '../components/UserProfileDropdown';
import { 
  Linkedin, 
  Mail, 
  X, 
  User, 
  Calendar,
  Heart
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SavedContact {
  user_id: string;
  saved_profile_id: string;
  name: string;
  background: string;
  interests: string;
  expertise: string;
  how_i_help: string[];
  photo_url: string;
  linkedin_url: string;
  email: string;
  why_saved: string;
  saved_at: string;
}

export default function SavedContactsPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [contacts, setContacts] = useState<SavedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchSavedContacts();
    } else if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [user, isLoaded, router]);

  const fetchSavedContacts = async () => {
    if (!user) return;

    try {
      // Get the current user's user_id from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('clerk_user_id', user.id)
        .single();

      if (userError || !userData) {
        console.error('User not found:', userError);
        setLoading(false);
        return;
      }

      // Fetch saved contacts
      const { data: savedData, error: savedError } = await supabase
        .from('saved_contacts')
        .select('user_id, saved_profile_id, reason, created_at')
        .eq('user_id', userData.user_id)
        .order('created_at', { ascending: false });

      if (savedError) {
        // Check if table doesn't exist yet
        if (savedError.message?.includes('relation') || savedError.message?.includes('does not exist')) {
          console.log('saved_contacts table does not exist yet. Please run create_saved_contacts_table.sql');
          setContacts([]);
          setLoading(false);
          return;
        }
        console.error('Error fetching saved contacts:', savedError);
        setContacts([]);
        setLoading(false);
        return;
      }

      if (!savedData || savedData.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      // Fetch profile data separately for each saved contact
      const profileIds = savedData.map(sc => sc.saved_profile_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, linkedin_url, profile_picture, background, interests, expertise, how_i_help')
        .in('user_id', profileIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setContacts([]);
        setLoading(false);
        return;
      }

      // Combine saved contacts with profile data
      const transformedContacts = savedData
        .map((item: any) => {
          const profile = profilesData?.find(p => p.user_id === item.saved_profile_id);
          if (!profile) return null;
          
          return {
            user_id: item.user_id,
            saved_profile_id: item.saved_profile_id,
            name: profile.name,
            background: profile.background || 'No background provided',
            interests: profile.interests || '',
            expertise: profile.expertise || '',
            how_i_help: profile.how_i_help || [],
            photo_url: profile.profile_picture || '',
            linkedin_url: profile.linkedin_url || '',
            email: profile.email,
            why_saved: item.reason || 'Saved from AI matching',
            saved_at: item.created_at
          };
        })
        .filter(contact => contact !== null) as SavedContact[];
      
      setContacts(transformedContacts);
    } catch (error) {
      console.error('Error fetching saved contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const removeContact = async (userId: string, savedProfileId: string) => {
    try {
      // Delete from database using composite key
      const { error } = await supabase
        .from('saved_contacts')
        .delete()
        .eq('user_id', userId)
        .eq('saved_profile_id', savedProfileId);

      if (error) {
        console.error('Error removing contact:', error);
        alert('Failed to remove contact');
        return;
      }

      // Remove from local state
      setContacts(prev => prev.filter(contact => contact.saved_profile_id !== savedProfileId));
    } catch (error) {
      console.error('Error removing contact:', error);
      alert('Failed to remove contact');
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
          savedProfileId: profileId,
          clickType: 'email',
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
          savedProfileId: profileId,
          clickType: 'linkedin',
        }),
      });
    } catch (error) {
      console.error('Error tracking LinkedIn click:', error);
    }
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 flex items-center justify-center">
        <p className="text-xs text-stone-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      {/* Navbar */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <img src="/mooring-logo.svg" alt="Mooring" className="w-6 h-6" />
              <span className="text-2xl font-bold text-stone-900 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/communities" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Communities</Link>
              <Link href="/my-cluster" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">My Cluster</Link>
              <Link href="/chat" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Find People</Link>
              <Link href="/saved" className="text-sm text-stone-900 font-medium">Saved</Link>
              <Link href="/profile" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Profile</Link>
              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6 pb-6 border-b border-stone-200/50">
          <h1 className="text-xl font-semibold text-stone-900 mb-1 tracking-tight" style={{ fontFamily: 'var(--font-ibm-plex)', fontWeight: 600 }}>
            Saved Contacts
          </h1>
          <p className="text-xs text-stone-500">
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} saved
          </p>
        </div>

        {/* Contacts List */}
        {contacts.length > 0 ? (
          <div className="space-y-0 border border-stone-200/50">
            {contacts.map((contact, index) => {
              const isExpanded = expandedCard === contact.saved_profile_id;
              return (
                <div 
                  key={contact.saved_profile_id}
                  className={`bg-white p-5 hover:bg-stone-50/50 transition-colors relative ${
                    index !== 0 ? 'border-t border-stone-200/50' : ''
                  }`}
                >
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeContact(contact.user_id, contact.saved_profile_id);
                    }}
                    className="absolute top-4 right-4 p-1 text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {!isExpanded ? (
                    /* Collapsed View */
                    <div className="flex items-start gap-3 pr-8">
                      {/* Profile Icon */}
                      <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                        {contact.photo_url ? (
                          <img 
                            src={contact.photo_url} 
                            alt={contact.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold text-xs">{contact.name.charAt(0)}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name and time */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-semibold text-stone-900 text-sm">
                            {contact.name}
                          </h3>
                          <span className="text-xs text-stone-400">· {formatTimeAgo(contact.saved_at)}</span>
                        </div>

                        {/* Bio preview */}
                        <p className="text-xs text-stone-600 leading-relaxed mb-2.5" style={{ lineHeight: '1.5' }}>
                          {contact.background.substring(0, 120) + '...'}
                        </p>

                        {/* Actions row */}
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            onClick={() => setExpandedCard(contact.saved_profile_id)}
                            className="text-stone-500 hover:text-stone-900 underline transition-colors"
                          >
                            Show more
                          </button>

                          <span className="text-stone-300">·</span>

                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 px-2 py-1 bg-stone-900 text-white hover:bg-stone-800 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmailClick(contact.saved_profile_id);
                          }}
                        >
                          <Mail className="w-3 h-3" />
                          Email
                        </a>
                        
                        {contact.linkedin_url && (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLinkedInClick(contact.saved_profile_id);
                            }}
                          >
                            <Linkedin className="w-3 h-3" />
                            LinkedIn
                          </a>
                        )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Expanded View - Full Profile Card */
                    <div className="space-y-6 pr-8">
                      {/* Header with profile image */}
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                          {contact.photo_url ? (
                            <img 
                              src={contact.photo_url} 
                              alt={contact.name}
                              className="w-11 h-11 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold text-sm">{contact.name.charAt(0)}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-stone-900 text-sm mb-1">
                            {contact.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-stone-500">
                            <span>{formatTimeAgo(contact.saved_at)}</span>
                          {contact.email && (
                            <>
                              <span>·</span>
                              <a 
                                href={`mailto:${contact.email}`} 
                                className="hover:text-stone-900 transition-colors"
                                onClick={() => handleEmailClick(contact.saved_profile_id)}
                              >
                                {contact.email}
                              </a>
                            </>
                          )}
                          {contact.linkedin_url && (
                            <>
                              <span>·</span>
                              <a 
                                href={contact.linkedin_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:text-stone-900 flex items-center gap-1 transition-colors"
                                onClick={() => handleLinkedInClick(contact.saved_profile_id)}
                              >
                                <Linkedin className="w-3 h-3" />
                                LinkedIn
                              </a>
                            </>
                          )}
                          </div>
                        </div>
                      </div>

                      {/* Why You Matched Card */}
                      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-300 rounded-xl p-4 shadow-sm">
                        <p className="text-sm font-bold text-teal-900 mb-3 flex items-center gap-2">
                          {contact.why_saved?.toLowerCase().includes('saved from community') || contact.why_saved === 'Saved from Community' ? (
                            <>
                              <Heart className="w-4 h-4 fill-teal-600 text-teal-600" />
                              <span>Saved from Community</span>
                            </>
                          ) : (
                            <>
                              <span>✨ Why You Matched</span>
                            </>
                          )}
                        </p>
                        <p className="text-sm text-stone-800 leading-relaxed" style={{ lineHeight: '1.7' }}>
                          {contact.why_saved?.toLowerCase().includes('saved from community') || contact.why_saved === 'Saved from Community' 
                            ? 'You saved this person from browsing your community clusters.'
                            : contact.why_saved
                          }
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-stone-200 -mx-2"></div>

                      {/* Background */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">Background</h4>
                        <p className="text-sm text-stone-700 leading-relaxed" style={{ lineHeight: '1.7' }}>
                          {contact.background}
                        </p>
                      </div>

                      {/* Interests */}
                      {contact.interests && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">Problems They're Obsessed With</h4>
                          <p className="text-sm text-stone-700 leading-relaxed" style={{ lineHeight: '1.7' }}>
                            {contact.interests}
                          </p>
                        </div>
                      )}

                      {/* Expertise */}
                      {contact.expertise && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">Expertise</h4>
                          <p className="text-sm text-stone-700 leading-relaxed" style={{ lineHeight: '1.7' }}>
                            {contact.expertise}
                          </p>
                        </div>
                      )}

                      {/* How They Help */}
                      {contact.how_i_help && contact.how_i_help.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">How They Help</h4>
                          <div className="flex flex-wrap gap-2">
                            {contact.how_i_help.map((help: string, idx: number) => (
                              <span 
                                key={idx} 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-full text-xs font-medium border border-amber-200"
                              >
                                {help === 'advising' && '💡 Advising or mentoring'}
                                {help === 'coffee_chats' && '☕ Coffee chats'}
                                {help === 'feedback' && '💬 Feedback'}
                                {help === 'introductions' && '🤝 Making introductions'}
                                {help === 'cofounding' && '🚀 Co-founding'}
                                {help === 'not_available' && '⏸️ Not available right now'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Collapse button */}
                      <button
                        onClick={() => setExpandedCard(null)}
                        className="text-xs text-stone-500 hover:text-stone-900 underline pt-2 transition-colors"
                      >
                        Show less
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 border border-stone-200/50 bg-white">
            <div className="w-12 h-12 flex items-center justify-center mb-3">
              <Heart className="w-6 h-6 text-stone-400" />
            </div>
            <h2 className="text-sm font-medium text-stone-900 mb-1">
              No contacts saved yet
            </h2>
            <p className="text-xs text-stone-500 mb-4 max-w-sm text-center">
              Find people through AI matching and save them here
            </p>
            <Link
              href="/chat"
              className="px-4 py-2 bg-stone-900 text-white hover:bg-stone-800 transition-colors text-xs font-medium"
            >
              Find People
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
