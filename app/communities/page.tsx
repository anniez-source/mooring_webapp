'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';
import UserProfileDropdown from '../components/UserProfileDropdown';
import { Users, Grid3x3, Circle } from 'lucide-react';

interface Cluster {
  cluster_id: string;
  label: string;
  keywords: string[];
  member_count: number;
  member_ids: string[];
}

export default function CommunitiesPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [hoveredCluster, setHoveredCluster] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [user, isLoaded, router]);

  useEffect(() => {
    const fetchClusters = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/clusters');
        if (response.ok) {
          const data = await response.json();
          // Sort clusters alphabetically by label
          const sortedClusters = (data.clusters || []).sort((a: any, b: any) => 
            a.label.localeCompare(b.label)
          );
          setClusters(sortedClusters);
          setOrgName(data.orgName);
          setCurrentUserId(data.currentUserId);
        }
      } catch (error) {
        console.error('Error fetching clusters:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && user) {
      fetchClusters();
    }
  }, [user, isLoaded]);

  // Generate cluster positions and colors for visualization
  const generateClusterData = () => {
    const width = 800;
    const height = 600;
    const padding = 100;
    
    return clusters.map((cluster, index) => {
      // Assign colors based on keywords
      const getColor = () => {
        const keywords = cluster.keywords.join(' ').toLowerCase();
        if (keywords.includes('climate') || keywords.includes('ocean') || keywords.includes('carbon')) return '#14b8a6'; // teal
        if (keywords.includes('health') || keywords.includes('bio') || keywords.includes('medical')) return '#ef4444'; // red
        if (keywords.includes('ai') || keywords.includes('ml') || keywords.includes('data')) return '#3b82f6'; // blue
        if (keywords.includes('education') || keywords.includes('learning')) return '#f59e0b'; // amber
        if (keywords.includes('finance') || keywords.includes('fintech')) return '#10b981'; // green
        return '#8b5cf6'; // purple (default)
      };
      
      // Calculate radius based on member count (min 40, max 120)
      const radius = Math.min(120, Math.max(40, 30 + cluster.member_count * 8));
      
      // Position clusters in a spiral pattern
      const angle = (index / clusters.length) * Math.PI * 2;
      const spiral = 1 + index * 0.3;
      const x = width / 2 + Math.cos(angle) * spiral * 50;
      const y = height / 2 + Math.sin(angle) * spiral * 50;
      
      return {
        ...cluster,
        x: Math.max(radius + padding, Math.min(width - radius - padding, x)),
        y: Math.max(radius + padding, Math.min(height - radius - padding, y)),
        radius,
        color: getColor(),
      };
    });
  };

  const clusterData = generateClusterData();

  if (!isLoaded || !user) {
    return null;
  }

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
      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                Communities
              </h1>
              <p className="text-stone-600">
                Discover clusters of people working on similar things in {orgName || 'your network'}.
              </p>
            </div>
            
            {/* View Toggle */}
            {clusters.length > 0 && (
              <div className="flex gap-2 bg-white border border-stone-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                    viewMode === 'map'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Circle className="w-4 h-4" />
                  <span className="text-sm font-medium">Map</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-stone-900 text-white'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                  <span className="text-sm font-medium">List</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
            <p className="text-stone-500">Loading communities...</p>
          </div>
        ) : clusters.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-lg p-12 text-center">
            <Users className="w-12 h-12 text-stone-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-stone-900 mb-2">No clusters detected yet</h2>
            <p className="text-stone-600 mb-6">
              Clusters are automatically generated when there are enough members with similar interests.
            </p>
            <Link 
              href="/chat" 
              className="inline-block px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition-colors"
            >
              Find People
            </Link>
          </div>
        ) : viewMode === 'map' ? (
          /* Cluster Map View */
          <div className="bg-white border border-stone-200 rounded-lg p-8 overflow-hidden">
            <svg viewBox="0 0 800 600" className="w-full" style={{ maxHeight: '600px' }}>
              {/* Background grid */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f5f5f4" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="800" height="600" fill="url(#grid)" />
              
              {/* Cluster bubbles */}
              {clusterData.map((cluster) => {
                const isHovered = hoveredCluster === cluster.cluster_id;
                const isUserInCluster = currentUserId && cluster.member_ids.includes(currentUserId);
                
                return (
                  <g key={cluster.cluster_id}>
                    {/* Glow effect for hovered cluster */}
                    {isHovered && (
                      <circle
                        cx={cluster.x}
                        cy={cluster.y}
                        r={cluster.radius + 10}
                        fill={cluster.color}
                        opacity="0.2"
                        className="animate-pulse"
                      />
                    )}
                    
                    {/* Main cluster circle */}
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={cluster.radius}
                      fill={cluster.color}
                      opacity={isHovered ? "0.9" : "0.7"}
                      stroke={isUserInCluster ? "#0d9488" : "#fff"}
                      strokeWidth={isUserInCluster ? "4" : "2"}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredCluster(cluster.cluster_id)}
                      onMouseLeave={() => setHoveredCluster(null)}
                      onClick={() => router.push(`/communities/${cluster.cluster_id}`)}
                      style={{ filter: isHovered ? 'drop-shadow(0 10px 20px rgba(0,0,0,0.2))' : 'none' }}
                    />
                    
                    {/* Member count */}
                    <text
                      x={cluster.x}
                      y={cluster.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="24"
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {cluster.member_count}
                    </text>
                    
                    {/* Label (show on hover or for user's cluster) */}
                    {(isHovered || isUserInCluster) && (
                      <g>
                        <rect
                          x={cluster.x - cluster.label.length * 3}
                          y={cluster.y + cluster.radius + 10}
                          width={cluster.label.length * 6}
                          height="24"
                          fill="white"
                          stroke="#e7e5e4"
                          strokeWidth="1"
                          rx="4"
                          className="pointer-events-none"
                        />
                        <text
                          x={cluster.x}
                          y={cluster.y + cluster.radius + 23}
                          textAnchor="middle"
                          fill="#1c1917"
                          fontSize="12"
                          fontWeight="600"
                          className="pointer-events-none"
                        >
                          {cluster.label.substring(0, 30)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
            
            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-stone-200">
              <h4 className="text-sm font-semibold text-stone-900 mb-3">Legend</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-teal-500"></div>
                  <span className="text-xs text-stone-600">Climate/Ocean</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500"></div>
                  <span className="text-xs text-stone-600">Health/Bio</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-stone-600">AI/Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  <span className="text-xs text-stone-600">Education</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-xs text-stone-600">Finance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                  <span className="text-xs text-stone-600">Other</span>
                </div>
              </div>
              <p className="text-xs text-stone-500 mt-3">
                Circle size = number of members. Click any cluster to explore.
              </p>
            </div>
          </div>
        ) : (
          /* List View */
          <div className="grid gap-4">
            {clusters.map((cluster) => {
              const isUserInCluster = currentUserId && cluster.member_ids.includes(currentUserId);
              
              return (
                <div
                  key={cluster.cluster_id}
                  className={`bg-white rounded-lg p-6 transition-all ${
                    isUserInCluster 
                      ? 'border-2 border-teal-500 shadow-md' 
                      : 'border border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-stone-900">
                          {cluster.label}
                        </h3>
                        {isUserInCluster && (
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-semibold">
                            You're in this cluster
                          </span>
                        )}
                        <span className="text-sm text-stone-500">
                          {cluster.member_count} {cluster.member_count === 1 ? 'member' : 'members'}
                        </span>
                      </div>
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
                    <Link
                      href={`/communities/${cluster.cluster_id}`}
                      className={`ml-4 px-4 py-2 text-sm rounded-lg transition-colors ${
                        isUserInCluster
                          ? 'bg-teal-600 hover:bg-teal-700 text-white'
                          : 'bg-stone-900 hover:bg-stone-800 text-white'
                      }`}
                    >
                      View Members
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">About Communities</h3>
          <p className="text-sm text-blue-800 leading-relaxed">
            These clusters are automatically detected using machine learning to group people working on similar problems or with related expertise. They update as your network grows and evolves.
          </p>
        </div>
      </div>
    </div>
  );
}

