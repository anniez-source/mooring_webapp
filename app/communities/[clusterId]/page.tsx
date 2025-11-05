'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import UserProfileDropdown from '../../components/UserProfileDropdown';
import { ArrowLeft, Mail, Linkedin, Heart } from 'lucide-react';

interface Member {
  user_id: string;
  name: string;
  email: string;
  background: string;
  expertise: string;
  interests: string;
  how_i_help: string[];
  linkedin_url: string | null;
  profile_picture: string | null;
  open_to: string | null;
  looking_for: string | null;
}

interface ClusterInfo {
  id: string;
  label: string;
  keywords: string[];
  memberCount: number;
}

export default function ClusterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoaded } = useUser();
  const [cluster, setCluster] = useState<ClusterInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [user, isLoaded, router]);

  useEffect(() => {
    const fetchClusterMembers = async () => {
      if (!user || !params.clusterId) return;
      
      try {
        console.log('[Communities] Fetching cluster:', params.clusterId);
        const response = await fetch(`/api/clusters/${params.clusterId}/members`);
        console.log('[Communities] Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[Communities] Data received:', data);
          setCluster(data.cluster);
          setMembers(data.members || []);
        } else {
          const errorData = await response.json();
          console.error('[Communities] Error response:', errorData);
        }
      } catch (error) {
        console.error('[Communities] Error fetching cluster members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && user) {
      fetchClusterMembers();
    }
  }, [user, isLoaded, params.clusterId, router]);

  // Load saved profiles
  useEffect(() => {
    const loadSavedProfiles = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch('/api/check-saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
        
        if (response.ok) {
          const data = await response.json();
          setSavedProfiles(new Set(data.savedProfileIds || []));
        }
      } catch (err) {
        console.error('Failed to load saved profiles:', err);
      }
    };
    
    loadSavedProfiles();
  }, [user?.id]);

  if (!isLoaded || !user) {
    return null;
  }

  const formatHelpType = (type: string) => {
    const labels: Record<string, string> = {
      'advising': 'Advising or mentoring',
      'coffee_chats': 'Coffee chats',
      'feedback': 'Feedback or spot advice',
      'introductions': 'Making introductions',
      'not_available': 'Not available right now'
    };
    return labels[type] || type;
  };

  // Handle saving a profile from community
  const handleSaveProfile = async (member: Member) => {
    if (!user?.id || savedProfiles.has(member.user_id)) return;

    try {
      const response = await fetch('/api/save-collaborator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          savedProfileId: member.user_id,
          reason: 'Saved from Community'
        })
      });

      if (response.ok) {
        setSavedProfiles(prev => new Set(prev).add(member.user_id));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save contact');
      }
    } catch (err) {
      console.error('Failed to save contact:', err);
      alert('Failed to save contact');
    }
  };

  // Extract all unique tags from members for filtering, organized by type
  const getOrganizedTags = () => {
    const domainTags = new Set<string>();
    const skillTags = new Set<string>();
    const helpTags = new Set<string>();
    
    members.forEach(member => {
      const keywords = [
        ...(member.expertise?.toLowerCase().split(/[,;]/).map((s: string) => s.trim()) || []),
        ...(member.interests?.toLowerCase().split(/[,;]/).map((s: string) => s.trim()) || [])
      ];
      
      const domains = ['climate', 'health', 'ai', 'education', 'fintech', 'biotech', 'energy', 'ocean', 'carbon', 'forestry', 'agriculture'];
      const skills = ['analytics', 'data science', 'machine learning', 'ml', 'engineering', 'design', 'research', 'product', 'strategy', 'operations', 'marketing'];
      
      keywords.forEach((kw: string) => {
        domains.forEach(domain => {
          if (kw.includes(domain)) {
            // Special case for AI - keep it uppercase
            const displayDomain = domain === 'ai' ? 'AI' : domain.charAt(0).toUpperCase() + domain.slice(1);
            domainTags.add(displayDomain);
          }
        });
        skills.forEach(skill => {
          if (kw.includes(skill)) {
            // Special case for ML - keep it uppercase
            const displaySkill = skill === 'ml' ? 'ML' : skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            skillTags.add(displaySkill);
          }
        });
      });
      
      if (member.how_i_help && Array.isArray(member.how_i_help)) {
        const helpMap: {[key: string]: string} = {
          advising: 'Advising',
          coffee_chats: 'Coffee',
          introductions: 'Intros',
          feedback: 'Feedback',
          cofounding: 'Co-founding',
          not_available: '' // Skip this value
        };
        member.how_i_help.forEach((help: string) => {
          if (helpMap[help] && helpMap[help] !== '') {
            helpTags.add(helpMap[help]);
          }
        });
      }
    });
    
    return {
      domains: Array.from(domainTags).sort(),
      skills: Array.from(skillTags).sort(),
      help: Array.from(helpTags).sort()
    };
  };

  const toggleFilter = (tag: string) => {
    setSelectedFilters(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Filter members based on search and selected tags
  const filteredMembers = members.filter(member => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        member.name?.toLowerCase().includes(query) ||
        member.background?.toLowerCase().includes(query) ||
        member.expertise?.toLowerCase().includes(query) ||
        member.interests?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Tag filters
    if (selectedFilters.length > 0) {
      const memberKeywords = [
        ...(member.expertise?.toLowerCase().split(/[,;]/).map((s: string) => s.trim()) || []),
        ...(member.interests?.toLowerCase().split(/[,;]/).map((s: string) => s.trim()) || [])
      ];
      
      const memberTags = new Set<string>();
      
      const domains = ['climate', 'health', 'ai', 'education', 'fintech', 'biotech', 'energy', 'ocean', 'carbon', 'forestry', 'agriculture'];
      const skills = ['analytics', 'data science', 'machine learning', 'ml', 'engineering', 'design', 'research', 'product', 'strategy', 'operations', 'marketing'];
      
      memberKeywords.forEach((kw: string) => {
        domains.forEach(domain => {
          if (kw.includes(domain)) {
            // Special case for AI - keep it uppercase
            const displayDomain = domain === 'ai' ? 'AI' : domain.charAt(0).toUpperCase() + domain.slice(1);
            memberTags.add(displayDomain);
          }
        });
        skills.forEach(skill => {
          if (kw.includes(skill)) {
            // Special case for ML - keep it uppercase
            const displaySkill = skill === 'ml' ? 'ML' : skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            memberTags.add(displaySkill);
          }
        });
      });
      
      if (member.how_i_help && Array.isArray(member.how_i_help)) {
        const helpMap: {[key: string]: string} = {
          advising: 'Advising',
          coffee_chats: 'Coffee',
          introductions: 'Intros',
          feedback: 'Feedback',
          cofounding: 'Co-founding',
          not_available: '' // Skip this value
        };
        member.how_i_help.forEach((help: string) => {
          if (helpMap[help] && helpMap[help] !== '') {
            memberTags.add(helpMap[help]);
          }
        });
      }
      
      const hasAllSelectedTags = selectedFilters.every(filter => memberTags.has(filter));
      if (!hasAllSelectedTags) return false;
    }
    
    return true;
  });

  const organizedTags = getOrganizedTags();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      {/* Navbar */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-white/20 relative z-50">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <img src="/mooring-logo.svg" alt="Mooring" className="w-6 h-6" />
              <span className="text-2xl font-bold text-stone-900 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/communities" className="text-sm text-stone-900 font-medium">Communities</Link>
              <Link href="/chat" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Find People</Link>
              <Link href="/saved" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Saved</Link>
              <Link href="/profile" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Profile</Link>
              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        <Link 
          href="/communities"
          className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Communities
        </Link>

        {isLoading ? (
          <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
            <p className="text-stone-500">Loading members...</p>
          </div>
        ) : cluster ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                {cluster.label}
              </h1>
              <p className="text-stone-600 mb-3">
                {filteredMembers.length} of {cluster.memberCount} {cluster.memberCount === 1 ? 'member' : 'members'}
                {selectedFilters.length > 0 && ' (filtered)'}
              </p>
              <div className="flex flex-wrap gap-2">
                {cluster.keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Search and Filter Section */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <input
                type="text"
                placeholder="Search by name, background, expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              
              {/* Filter Tags - Organized by Type */}
              {(organizedTags.domains.length > 0 || organizedTags.skills.length > 0 || organizedTags.help.length > 0) && (
                <div className="bg-white border border-stone-200 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-stone-900">Filter Members</p>
                    {selectedFilters.length > 0 && (
                      <button
                        onClick={() => setSelectedFilters([])}
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium underline"
                      >
                        Clear all ({selectedFilters.length})
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {/* Domain Tags - Teal */}
                    {organizedTags.domains.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded bg-teal-500"></div>
                          <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
                            Domains & Industries
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {organizedTags.domains.map((tag) => {
                            const isSelected = selectedFilters.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleFilter(tag)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                  isSelected
                                    ? 'bg-teal-600 text-white border border-teal-600 shadow-sm'
                                    : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 hover:border-teal-300'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Skill Tags - Gray */}
                    {organizedTags.skills.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded bg-stone-500"></div>
                          <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
                            Skills & Expertise
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {organizedTags.skills.map((tag) => {
                            const isSelected = selectedFilters.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleFilter(tag)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                  isSelected
                                    ? 'bg-stone-700 text-white border border-stone-700 shadow-sm'
                                    : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200 hover:border-stone-300'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Help Tags - Yellow/Amber */}
                    {organizedTags.help.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded bg-amber-500"></div>
                          <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
                            How They Help
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {organizedTags.help.map((tag) => {
                            const isSelected = selectedFilters.includes(tag);
                            return (
                              <button
                                key={tag}
                                onClick={() => toggleFilter(tag)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                  isSelected
                                    ? 'bg-amber-600 text-white border border-amber-600 shadow-sm'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {filteredMembers.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
                <p className="text-stone-500">No members match your filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedFilters([]);
                  }}
                  className="mt-3 text-sm text-teal-600 hover:text-teal-700 underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredMembers.map((member) => {
                // Extract tags from member data
                const extractTags = (m: Member) => {
                  const tags: Array<{text: string, type: string}> = [];
                  
                  // Extract domain keywords from expertise/interests
                  const keywords = [
                    ...(m.expertise?.toLowerCase().split(/[,;]/).map((s: string) => s.trim()) || []),
                    ...(m.interests?.toLowerCase().split(/[,;]/).map((s: string) => s.trim()) || [])
                  ];
                  
                  // Domain tags
                  const domains = ['climate', 'health', 'ai', 'education', 'fintech', 'biotech', 'energy', 'ocean', 'carbon', 'forestry', 'agriculture'];
                  keywords.forEach((kw: string) => {
                    domains.forEach(domain => {
                      if (kw.includes(domain) && !tags.some(t => t.text.toLowerCase().includes(domain))) {
                        // Special case for AI - keep it uppercase
                        const displayDomain = domain === 'ai' ? 'AI' : domain.charAt(0).toUpperCase() + domain.slice(1);
                        tags.push({ text: displayDomain, type: 'domain' });
                      }
                    });
                  });
                  
                  // Skills/methods tags
                  const skills = ['analytics', 'data science', 'machine learning', 'ml', 'engineering', 'design', 'research', 'product', 'strategy', 'operations', 'marketing'];
                  keywords.forEach((kw: string) => {
                    skills.forEach(skill => {
                      if (kw.includes(skill) && !tags.some(t => t.text.toLowerCase().includes(skill))) {
                        // Special case for ML - keep it uppercase
                        const displaySkill = skill === 'ml' ? 'ML' : skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        tags.push({ text: displaySkill, type: 'skill' });
                      }
                    });
                  });
                  
                  // Help type tags
                  if (m.how_i_help && Array.isArray(m.how_i_help)) {
                    const helpMap: {[key: string]: string} = {
                      advising: 'Advising',
                      coffee_chats: 'Coffee',
                      introductions: 'Intros',
                      feedback: 'Feedback',
                      cofounding: 'Co-founding',
                      not_available: '' // Skip this value
                    };
                    m.how_i_help.forEach((help: string) => {
                      if (helpMap[help] && helpMap[help] !== '') {
                        tags.push({ text: helpMap[help], type: 'help' });
                      }
                    });
                  }
                  
                  return tags.slice(0, 6); // Limit to 6 tags
                };
                
                const tags = extractTags(member);
                
                return (
                  <div
                    key={member.user_id}
                    className="bg-white border border-stone-200 rounded-xl p-4 hover:shadow-md transition-all group relative"
                  >
                    {/* Save button (heart) */}
                    <button
                      onClick={() => handleSaveProfile(member)}
                      disabled={savedProfiles.has(member.user_id)}
                      className={`absolute top-4 right-4 p-2 rounded-lg transition-all ${
                        savedProfiles.has(member.user_id)
                          ? 'bg-red-50 text-red-600'
                          : 'hover:bg-stone-100 text-stone-400 hover:text-red-600'
                      }`}
                      title={savedProfiles.has(member.user_id) ? 'Saved' : 'Save contact'}
                    >
                      <Heart 
                        className={`w-4 h-4 ${savedProfiles.has(member.user_id) ? 'fill-current' : ''}`}
                      />
                    </button>

                    <div className="flex items-start gap-3 pr-10">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-base shadow-sm">
                        {member.name?.charAt(0) || '?'}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {/* Name */}
                        <h3 className="font-bold text-stone-900 text-base mb-1.5">
                          {member.name}
                        </h3>
                        
                        {/* Tags Row */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {tags.map((tag, idx) => (
                              <span 
                                key={idx}
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                                  tag.type === 'domain' 
                                    ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                                    : tag.type === 'help'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                                }`}
                              >
                                {tag.text}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Preview text */}
                        <p className="text-xs text-stone-600 leading-relaxed line-clamp-2 mb-2">
                          {member.background || member.interests || member.expertise}
                        </p>
                        
                        {/* Expanded view */}
                        {expandedMember === member.user_id ? (
                          <div className="space-y-3 text-xs pt-2 border-t border-stone-100">
                            {member.background && (
                              <div>
                                <p className="text-stone-500 font-medium mb-1">Background</p>
                                <p className="text-stone-600 leading-relaxed">{member.background}</p>
                              </div>
                            )}
                            
                            {member.interests && (
                              <div>
                                <p className="text-stone-500 font-medium mb-1">Problems They're Obsessed With</p>
                                <p className="text-stone-600 leading-relaxed">{member.interests}</p>
                              </div>
                            )}
                            
                            {member.expertise && (
                              <div>
                                <p className="text-stone-500 font-medium mb-1">Expertise</p>
                                <p className="text-stone-600 leading-relaxed">{member.expertise}</p>
                              </div>
                            )}
                            
                            <div className="flex gap-2 pt-2">
                              <a
                                href={`mailto:${member.email}`}
                                className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-xs font-medium"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                Email
                              </a>
                              {member.linkedin_url && (
                                <a
                                  href={member.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-xs font-medium"
                                >
                                  <Linkedin className="w-3.5 h-3.5" />
                                  LinkedIn
                                </a>
                              )}
                            </div>
                            
                            <button
                              onClick={() => setExpandedMember(null)}
                              className="text-teal-600 hover:text-teal-700 text-xs font-medium underline"
                            >
                              Show less
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setExpandedMember(member.user_id)}
                            className="text-teal-600 hover:text-teal-700 text-xs font-medium underline"
                          >
                            View full profile →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
            <p className="text-stone-500">Cluster not found</p>
          </div>
        )}
      </div>
    </div>
  );
}







