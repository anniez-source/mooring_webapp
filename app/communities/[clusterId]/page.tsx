'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import UserProfileDropdown from '../../components/UserProfileDropdown';
import { ArrowLeft, Mail, Linkedin } from 'lucide-react';

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

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [user, isLoaded, router]);

  useEffect(() => {
    const fetchClusterMembers = async () => {
      if (!user || !params.clusterId) return;
      
      try {
        const response = await fetch(`/api/clusters/${params.clusterId}/members`);
        if (response.ok) {
          const data = await response.json();
          setCluster(data.cluster);
          setMembers(data.members || []);
        }
      } catch (error) {
        console.error('Error fetching cluster members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && user) {
      fetchClusterMembers();
    }
  }, [user, isLoaded, params.clusterId]);

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
                {cluster.memberCount} {cluster.memberCount === 1 ? 'member' : 'members'}
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

            <div className="grid gap-4">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="bg-white border border-stone-200 rounded-lg p-6 hover:border-stone-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-lg">
                      {member.name?.charAt(0) || '?'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-stone-900 mb-1">
                        {member.name}
                      </h3>
                      
                      {expandedMember === member.user_id ? (
                        <div className="space-y-3 text-sm">
                          {member.background && (
                            <div>
                              <p className="font-medium text-stone-700 mb-1">Background</p>
                              <p className="text-stone-600 leading-relaxed">{member.background}</p>
                            </div>
                          )}
                          
                          {member.interests && (
                            <div>
                              <p className="font-medium text-stone-700 mb-1">Problems They're Obsessed With</p>
                              <p className="text-stone-600 leading-relaxed">{member.interests}</p>
                            </div>
                          )}
                          
                          {member.expertise && (
                            <div>
                              <p className="font-medium text-stone-700 mb-1">Expertise</p>
                              <p className="text-stone-600 leading-relaxed">{member.expertise}</p>
                            </div>
                          )}
                          
                          {member.how_i_help && member.how_i_help.length > 0 && !member.how_i_help.includes('not_available') && (
                            <div>
                              <p className="font-medium text-stone-700 mb-1">How They Help</p>
                              <div className="flex flex-wrap gap-2">
                                {member.how_i_help.map((help, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs"
                                  >
                                    {formatHelpType(help)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2 pt-2">
                            <a
                              href={`mailto:${member.email}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-xs font-medium"
                            >
                              <Mail className="w-3 h-3" />
                              Email
                            </a>
                            {member.linkedin_url && (
                              <a
                                href={member.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-xs font-medium"
                              >
                                <Linkedin className="w-3 h-3" />
                                LinkedIn
                              </a>
                            )}
                          </div>
                          
                          <button
                            onClick={() => setExpandedMember(null)}
                            className="text-stone-600 hover:text-stone-900 text-xs underline"
                          >
                            Show less
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-stone-600 mb-2 line-clamp-2 leading-relaxed">
                            {member.background || member.interests || member.expertise}
                          </p>
                          <button
                            onClick={() => setExpandedMember(member.user_id)}
                            className="text-stone-600 hover:text-stone-900 text-xs underline"
                          >
                            Show more
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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







