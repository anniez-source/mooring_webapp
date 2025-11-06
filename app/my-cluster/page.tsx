'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Heart, Linkedin, Mail, Users } from 'lucide-react';
import { useBehaviorTracking } from '@/lib/useBehaviorTracking';

interface SimilarProfile {
  user_id: string;
  name: string;
  email: string;
  background?: string;
  interests?: string;
  expertise?: string;
  how_i_help?: string[];
  linkedin_url?: string;
  profile_picture?: string;
  similarity: number;
}

interface MyClusterData {
  userProfile: {
    name: string;
    background?: string;
    interests?: string;
    expertise?: string;
  };
  similarProfiles: SimilarProfile[];
  totalMatches: number;
}

export default function MyClusterPage() {
  const { user } = useUser();
  const { trackProfileView } = useBehaviorTracking();
  const [clusterData, setClusterData] = useState<MyClusterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<SimilarProfile | null>(null);
  const [hoveredProfile, setHoveredProfile] = useState<string | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchClusterData();
    loadSavedProfiles();
  }, []);

  const fetchClusterData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my-cluster');
      
      if (!response.ok) {
        throw new Error('Failed to load your cluster');
      }

      const data = await response.json();
      setClusterData(data);
    } catch (err) {
      console.error('Error loading cluster:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cluster');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedProfiles = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/check-saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedProfiles(new Set(data.savedProfileIds || []));
      }
    } catch (err) {
      console.error('Error loading saved profiles:', err);
    }
  };

  const handleSaveProfile = async (profile: SimilarProfile) => {
    if (!user?.id || savedProfiles.has(profile.user_id)) return;

    try {
      const response = await fetch('/api/save-collaborator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          savedProfileId: profile.user_id,
          whySaved: `You're ${profile.similarity}% similar - found in your personal cluster`,
        }),
      });

      if (response.ok) {
        setSavedProfiles(prev => new Set([...prev, profile.user_id]));
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  const generateRadialLayout = () => {
    if (!clusterData) return [];

    const width = 1000;
    const height = 800;
    const centerX = width / 2;
    const centerY = height / 2;

    // Split into inner and outer rings based on similarity
    const innerRing = clusterData.similarProfiles.filter(p => p.similarity >= 85);
    const outerRing = clusterData.similarProfiles.filter(p => p.similarity < 85);

    const innerRadius = 180;
    const outerRadius = 340;
    const nodeRadius = 50;

    const layout = [];

    // Inner ring (high similarity)
    innerRing.forEach((profile, idx) => {
      const angle = (idx / innerRing.length) * 2 * Math.PI - Math.PI / 2;
      layout.push({
        ...profile,
        x: centerX + Math.cos(angle) * innerRadius,
        y: centerY + Math.sin(angle) * innerRadius,
        radius: nodeRadius,
        ring: 'inner'
      });
    });

    // Outer ring (moderate similarity)
    outerRing.forEach((profile, idx) => {
      const angle = (idx / outerRing.length) * 2 * Math.PI - Math.PI / 2;
      layout.push({
        ...profile,
        x: centerX + Math.cos(angle) * outerRadius,
        y: centerY + Math.sin(angle) * outerRadius,
        radius: nodeRadius * 0.8,
        ring: 'outer'
      });
    });

    return layout;
  };

  const radialLayout = generateRadialLayout();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-stone-600">Finding your people...</p>
        </div>
      </div>
    );
  }

  if (error || !clusterData) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Users className="w-12 h-12 text-stone-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Unable to Load Cluster</h2>
          <p className="text-stone-600 mb-4">{error || 'Please try again later'}</p>
          <button
            onClick={fetchClusterData}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Your Personal Cluster</h1>
          <p className="text-stone-600">
            {clusterData.totalMatches} people most similar to your profile
          </p>
        </div>

        {/* Radial Visualization */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200/50 mb-6">
          <svg 
            viewBox="0 0 1000 800" 
            className="w-full" 
            style={{ 
              maxHeight: '800px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          >
            {/* Background */}
            <rect width="1000" height="800" fill="#fafaf9" />

            {/* Define gradients and filters */}
            <defs>
              <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.2"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              <radialGradient id="centerGradient" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
                <stop offset="50%" stopColor="#0891b2" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.4"/>
              </radialGradient>

              <radialGradient id="innerNodeGrad" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
                <stop offset="60%" stopColor="#14b8a6" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9"/>
              </radialGradient>

              <radialGradient id="outerNodeGrad" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
                <stop offset="60%" stopColor="#94a3b8" stopOpacity="0.7"/>
                <stop offset="100%" stopColor="#64748b" stopOpacity="0.8"/>
              </radialGradient>
            </defs>

            {/* Connection rings */}
            <circle
              cx="500"
              cy="400"
              r="180"
              fill="none"
              stroke="#0891b2"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.3"
            />
            <circle
              cx="500"
              cy="400"
              r="340"
              fill="none"
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.2"
            />

            {/* Center node (YOU) */}
            <circle
              cx="500"
              cy="400"
              r="70"
              fill="url(#centerGradient)"
              filter="url(#softShadow)"
            />
            <circle
              cx="500"
              cy="400"
              r="65"
              fill="none"
              stroke="#0891b2"
              strokeWidth="3"
            />
            <text
              x="500"
              y="395"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#0891b2"
              fontSize="16"
              fontWeight="600"
            >
              YOU
            </text>
            <text
              x="500"
              y="415"
              textAnchor="middle"
              fill="#57534e"
              fontSize="12"
              fontWeight="500"
            >
              {clusterData.userProfile.name?.split(' ')[0] || 'You'}
            </text>

            {/* Similar profiles */}
            {radialLayout.map((profile) => {
              const isHovered = hoveredProfile === profile.user_id;
              const isSelected = selectedProfile?.user_id === profile.user_id;
              const isSaved = savedProfiles.has(profile.user_id);

              return (
                <g key={profile.user_id}>
                  {/* Connection line to center */}
                  {(isHovered || isSelected) && (
                    <line
                      x1="500"
                      y1="400"
                      x2={profile.x}
                      y2={profile.y}
                      stroke={profile.ring === 'inner' ? '#0891b2' : '#64748b'}
                      strokeWidth="2"
                      opacity="0.3"
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* Hover glow */}
                  {isHovered && (
                    <circle
                      cx={profile.x}
                      cy={profile.y}
                      r={profile.radius + 8}
                      fill={profile.ring === 'inner' ? '#67e8f9' : '#cbd5e1'}
                      opacity="0.3"
                    />
                  )}

                  {/* Profile node */}
                  <circle
                    cx={profile.x}
                    cy={profile.y}
                    r={profile.radius}
                    fill={`url(#${profile.ring}NodeGrad)`}
                    stroke={isSelected ? '#0891b2' : '#ffffff'}
                    strokeWidth={isSelected ? '3' : '2'}
                    filter="url(#softShadow)"
                    opacity={isHovered ? '0.95' : '0.85'}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredProfile(profile.user_id)}
                    onMouseLeave={() => setHoveredProfile(null)}
                    onClick={() => {
                      setSelectedProfile(profile);
                      if (user?.id) {
                        trackProfileView(user.id, profile.user_id).catch(console.error);
                      }
                    }}
                  />

                  {/* Similarity percentage */}
                  <text
                    x={profile.x}
                    y={profile.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={profile.ring === 'inner' ? '#0891b2' : '#64748b'}
                    fontSize="14"
                    fontWeight="600"
                    className="pointer-events-none"
                  >
                    {profile.similarity}%
                  </text>

                  {/* Name label (on hover) */}
                  {isHovered && (
                    <text
                      x={profile.x}
                      y={profile.y + profile.radius + 15}
                      textAnchor="middle"
                      fill="#1c1917"
                      fontSize="12"
                      fontWeight="500"
                      className="pointer-events-none"
                    >
                      {profile.name?.length > 20 ? profile.name.substring(0, 20) + '...' : profile.name}
                    </text>
                  )}

                  {/* Saved indicator */}
                  {isSaved && (
                    <circle
                      cx={profile.x + profile.radius - 12}
                      cy={profile.y - profile.radius + 12}
                      r="8"
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="pointer-events-none"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-stone-200/60">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <div className="flex items-center gap-6">
                <span className="font-medium text-stone-700">Similarity:</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#0891b2' }}></div>
                    <span>85%+ (Inner Ring)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: '#64748b' }}></div>
                    <span>70-85% (Outer Ring)</span>
                  </div>
                </div>
              </div>
              <div className="text-stone-400">
                Click any node to view profile
              </div>
            </div>
          </div>
        </div>

        {/* Selected Profile Detail */}
        {selectedProfile && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold text-lg">
                  {selectedProfile.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-stone-900">{selectedProfile.name}</h3>
                  <p className="text-sm text-teal-600 font-medium">{selectedProfile.similarity}% match</p>
                </div>
              </div>
              <button
                onClick={() => handleSaveProfile(selectedProfile)}
                disabled={savedProfiles.has(selectedProfile.user_id)}
                className={`p-2 rounded-lg transition-all ${
                  savedProfiles.has(selectedProfile.user_id)
                    ? 'bg-red-50 text-red-600'
                    : 'hover:bg-stone-100 text-stone-400 hover:text-red-600'
                }`}
              >
                <Heart className={`w-5 h-5 ${savedProfiles.has(selectedProfile.user_id) ? 'fill-current' : ''}`} />
              </button>
            </div>

            <div className="space-y-4">
              {selectedProfile.background && (
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">Background</h4>
                  <p className="text-sm text-stone-700 leading-relaxed">{selectedProfile.background}</p>
                </div>
              )}
              
              {selectedProfile.expertise && (
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">Expertise</h4>
                  <p className="text-sm text-stone-700 leading-relaxed">{selectedProfile.expertise}</p>
                </div>
              )}

              {selectedProfile.interests && (
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">Interests</h4>
                  <p className="text-sm text-stone-700 leading-relaxed">{selectedProfile.interests}</p>
                </div>
              )}

              {selectedProfile.how_i_help && selectedProfile.how_i_help.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide mb-2">How They Help</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.how_i_help.map((help: string, idx: number) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 rounded-full text-xs font-medium border border-amber-200"
                      >
                        {help === 'advising' && '💡 Advising'}
                        {help === 'coffee_chats' && '☕ Coffee chats'}
                        {help === 'feedback' && '💬 Feedback'}
                        {help === 'introductions' && '🤝 Introductions'}
                        {help === 'cofounding' && '🚀 Co-founding'}
                        {help === 'not_available' && '⏸️ Not available'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <a
                  href={`mailto:${selectedProfile.email}`}
                  className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </a>
                {selectedProfile.linkedin_url && (
                  <a
                    href={selectedProfile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-sm font-medium"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

