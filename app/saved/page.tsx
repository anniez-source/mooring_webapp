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
  bio: string;
  expertise: string;
  looking_for: any[];
  open_to: any[];
  photo_url: string;
  linkedin_url: string;
  email: string;
  slack_id?: string;
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
        .select('user_id, name, email, linkedin_url, profile_picture, background, expertise, looking_for, open_to')
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
            bio: profile.background || 'No bio provided',
            expertise: profile.expertise || '',
            looking_for: profile.looking_for || [],
            open_to: profile.open_to || [],
            photo_url: profile.profile_picture || '',
            linkedin_url: profile.linkedin_url || '',
            email: profile.email,
            slack_id: undefined,
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

  const formatCommitmentItem = (item: { type: string; commitment: string }) => {
    const labels: { [key: string]: string } = {
      // Looking For - High Commitment
      'technical_cofounder': 'Technical cofounder',
      'business_cofounder': 'Business cofounder',
      'team_member': 'Team member',
      'long_term_project_collaborator': 'Long-term project collaborator',
      // Looking For - Medium Commitment
      'advisor': 'Advisor',
      'service_provider': 'Service provider (ongoing)',
      'project_collaboration': 'Project collaborator (specific project)',
      'beta_tester': 'Beta tester',
      // Looking For - Low Commitment
      'introduction': 'Introduction to someone specific',
      'quick_consultation': 'Quick consultation (30 min)',
      'coffee_chats': 'Coffee chats / networking',
      // Open To - High Commitment
      'being_technical_cofounder': 'Being a technical cofounder',
      'being_business_cofounder': 'Being a business cofounder',
      'joining_team': 'Joining a team',
      'long_term_collaboration': 'Long-term project collaboration',
      // Open To - Medium Commitment
      'advising': 'Advising / mentoring',
      'mentoring': 'Advising / mentoring',
      'project_collaboration_open': 'Collaborating on projects',
      'collaborating_projects': 'Collaborating on projects',
      'providing_services': 'Providing services',
      'being_beta_tester': 'Being a beta tester',
      // Open To - Low Commitment
      'making_introductions': 'Making introductions',
      'offering_consultation': 'Offering quick consultations (30 min)',
      // Other
      'other': 'Other'
    };
    
    return labels[item.type] || item.type;
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
              <Link href="/chat" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Find People</Link>
              <Link href="/saved" className="text-sm text-stone-900 font-medium">Saved</Link>
              <Link href="/profile" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Profile</Link>
              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-stone-900 mb-1 tracking-tight" style={{ fontFamily: 'var(--font-ibm-plex)', fontWeight: 600 }}>
            Saved Contacts
          </h1>
          <p className="text-sm text-stone-500">
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} saved
          </p>
        </div>

        {/* Contacts List */}
        {contacts.length > 0 ? (
          <div className="space-y-4">
            {contacts.map((contact) => {
              const isExpanded = expandedCard === contact.saved_profile_id;
              return (
                <div 
                  key={contact.saved_profile_id}
                  className="bg-white rounded-xl border border-stone-200 p-6 hover:border-stone-300 transition-all relative"
                  style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
                >
                  {/* Remove button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeContact(contact.user_id, contact.saved_profile_id);
                    }}
                    className="absolute top-4 right-4 p-1 rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {!isExpanded ? (
                    /* Collapsed View */
                    <div className="flex items-start gap-4 pr-8">
                      {/* Profile Icon */}
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        {contact.photo_url ? (
                          <img 
                            src={contact.photo_url} 
                            alt={contact.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-white font-medium text-sm">{contact.name.charAt(0)}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name and time */}
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-stone-900 text-base">
                            {contact.name}
                          </h3>
                          <span className="text-xs text-stone-400">• Saved {formatTimeAgo(contact.saved_at)}</span>
                        </div>

                        {/* Bio preview */}
                        <p className="text-sm text-stone-700 leading-relaxed mb-3" style={{ lineHeight: '1.6' }}>
                          {contact.bio.substring(0, 150) + '...'}
                        </p>

                        {/* Actions row */}
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => setExpandedCard(contact.saved_profile_id)}
                            className="text-xs text-stone-500 hover:text-teal-600 font-medium transition-colors"
                          >
                            View full profile
                          </button>

                          <span className="text-stone-300">•</span>

                        <a
                          href={`mailto:${contact.email}`}
                          className="text-xs text-stone-500 hover:text-teal-600 font-medium transition-colors flex items-center gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmailClick(contact.saved_profile_id);
                          }}
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Email
                        </a>
                        
                        {contact.linkedin_url && (
                          <>
                            <span className="text-stone-300">•</span>
                            <a
                              href={contact.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-stone-500 hover:text-teal-600 font-medium transition-colors flex items-center gap-1.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLinkedInClick(contact.saved_profile_id);
                              }}
                            >
                              <Linkedin className="w-3.5 h-3.5" />
                              LinkedIn
                            </a>
                          </>
                        )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Expanded View - Full Profile Card */
                    <div className="space-y-6">
                      {/* Header with profile image */}
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          {contact.photo_url ? (
                            <img 
                              src={contact.photo_url} 
                              alt={contact.name}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="text-white font-medium text-xl">{contact.name.charAt(0)}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-stone-900 text-lg mb-1">
                            {contact.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-stone-500 mb-3">
                            <span>Saved {formatTimeAgo(contact.saved_at)}</span>
                          {contact.email && (
                            <>
                              <span>•</span>
                              <a 
                                href={`mailto:${contact.email}`} 
                                className="hover:text-teal-600"
                                onClick={() => handleEmailClick(contact.saved_profile_id)}
                              >
                                {contact.email}
                              </a>
                            </>
                          )}
                          {contact.linkedin_url && (
                            <>
                              <span>•</span>
                              <a 
                                href={contact.linkedin_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:text-teal-600 flex items-center gap-1"
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

                      {/* AI Match Reason */}
                      <div className="bg-teal-50 border border-teal-100 rounded-lg p-4">
                        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">Why We Matched You</p>
                        <p className="text-sm text-stone-700 leading-relaxed">
                          {contact.why_saved}
                        </p>
                      </div>

                      {/* Background */}
                      <div>
                        <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Background</h4>
                        <p className="text-sm text-stone-700 leading-relaxed" style={{ lineHeight: '1.6' }}>
                          {contact.bio}
                        </p>
                      </div>

                      {/* Expertise */}
                      {contact.expertise && (
                        <div>
                          <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Expertise</h4>
                          <p className="text-sm text-stone-700 leading-relaxed" style={{ lineHeight: '1.6' }}>
                            {contact.expertise}
                          </p>
                        </div>
                      )}

                      {/* Looking For & Open To */}
                      <div className="flex gap-8">
                        {/* Looking For */}
                        {contact.looking_for && contact.looking_for.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Looking For</h4>
                            <div className="space-y-1.5">
                              {contact.looking_for.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-stone-700">
                                  <span className="w-1 h-1 rounded-full bg-teal-600"></span>
                                  {formatCommitmentItem(item)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Open To */}
                        {contact.open_to && contact.open_to.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Open To</h4>
                            <div className="space-y-1.5">
                              {contact.open_to.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-stone-700">
                                  <span className="w-1 h-1 rounded-full bg-teal-600"></span>
                                  {formatCommitmentItem(item)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Collapse button */}
                      <button
                        onClick={() => setExpandedCard(null)}
                        className="w-full text-xs text-stone-500 hover:text-teal-600 font-medium py-2 border-t border-stone-200 transition-colors"
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
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-stone-400" />
            </div>
            <h2 className="text-xl font-semibold text-stone-900 mb-2">
              No contacts saved yet
            </h2>
            <p className="text-sm text-stone-500 mb-6 max-w-sm text-center">
              Find people through AI matching and save them here for easy access
            </p>
            <Link
              href="/chat"
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
            >
              Find People
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
