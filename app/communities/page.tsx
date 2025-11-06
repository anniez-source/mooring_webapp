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
    const width = 1000;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Find min and max member counts for relative scaling
    const memberCounts = clusters.map(c => c.member_count);
    const minMembers = Math.min(...memberCounts);
    const maxMembers = Math.max(...memberCounts);
    
    // Assign colors and domain to each cluster
    const clustersWithMeta = clusters.map(cluster => {
      const keywords = cluster.keywords.join(' ').toLowerCase();
      let domain = 'other';
      let colors = { fill: '#7c3aed', stroke: '#8b5cf6', light: '#c4b5fd' };
      
      if (keywords.includes('climate') || keywords.includes('ocean') || keywords.includes('carbon')) {
        domain = 'climate';
        colors = { fill: '#0d9488', stroke: '#14b8a6', light: '#5eead4' };
      } else if (keywords.includes('health') || keywords.includes('bio') || keywords.includes('medical')) {
        domain = 'health';
        colors = { fill: '#dc2626', stroke: '#ef4444', light: '#fca5a5' };
      } else if (keywords.includes('ai') || keywords.includes('ml') || keywords.includes('data')) {
        domain = 'ai';
        colors = { fill: '#2563eb', stroke: '#3b82f6', light: '#93c5fd' };
      } else if (keywords.includes('education') || keywords.includes('learning')) {
        domain = 'education';
        colors = { fill: '#d97706', stroke: '#f59e0b', light: '#fcd34d' };
      } else if (keywords.includes('finance') || keywords.includes('fintech')) {
        domain = 'finance';
        colors = { fill: '#059669', stroke: '#10b981', light: '#6ee7b7' };
      }
      
      // Scale radius relative to the data range
      // Map member_count from [minMembers, maxMembers] to [60px, 180px]
      const minRadius = 60;
      const maxRadius = 180;
      
      let radius;
      if (minMembers === maxMembers) {
        // All clusters have same size
        radius = (minRadius + maxRadius) / 2;
      } else {
        // Linear interpolation based on member count
        const normalizedSize = (cluster.member_count - minMembers) / (maxMembers - minMembers);
        radius = minRadius + normalizedSize * (maxRadius - minRadius);
      }
      
      return { ...cluster, domain, colors, radius };
    });
    
    // Group clusters by domain
    const domainGroups: { [key: string]: typeof clustersWithMeta } = {};
    clustersWithMeta.forEach(c => {
      if (!domainGroups[c.domain]) domainGroups[c.domain] = [];
      domainGroups[c.domain].push(c);
    });
    
    // Position each domain group in a specific area
    const domainPositions: { [key: string]: { x: number, y: number } } = {
      'climate': { x: centerX - 250, y: centerY - 150 },
      'health': { x: centerX + 250, y: centerY - 150 },
      'ai': { x: centerX, y: centerY + 150 },
      'education': { x: centerX - 250, y: centerY + 150 },
      'finance': { x: centerX + 250, y: centerY + 150 },
      'other': { x: centerX, y: centerY - 150 },
    };
    
    // Position clusters within their domain group
    return clustersWithMeta.map((cluster) => {
      const groupCenter = domainPositions[cluster.domain] || { x: centerX, y: centerY };
      const groupMembers = domainGroups[cluster.domain];
      const indexInGroup = groupMembers.indexOf(cluster);
      
      // If only one cluster in group, place at center
      if (groupMembers.length === 1) {
        return {
          ...cluster,
          x: groupCenter.x,
          y: groupCenter.y,
        };
      }
      
      // Arrange multiple clusters in a circle around the group center
      const angle = (indexInGroup / groupMembers.length) * Math.PI * 2;
      const radius = 80; // Distance from group center
      
      return {
        ...cluster,
        x: groupCenter.x + Math.cos(angle) * radius,
        y: groupCenter.y + Math.sin(angle) * radius,
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
          <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl p-8 shadow-inner">
            <svg viewBox="0 0 1000 600" className="w-full" style={{ maxHeight: '600px' }}>
              {/* Subtle background */}
              <defs>
                <radialGradient id="bgGradient" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#fafaf9" />
                  <stop offset="100%" stopColor="#f5f5f4" />
                </radialGradient>
              </defs>
              <rect width="1000" height="600" fill="url(#bgGradient)" rx="12" />
              
              {/* Cluster bubbles */}
              {clusterData.map((cluster) => {
                const isHovered = hoveredCluster === cluster.cluster_id;
                const isUserInCluster = currentUserId && cluster.member_ids.includes(currentUserId);
                
                return (
                  <g key={cluster.cluster_id}>
                    {/* Outer glow ring for hovered cluster */}
                    {isHovered && (
                      <circle
                        cx={cluster.x}
                        cy={cluster.y}
                        r={cluster.radius + 15}
                        fill="none"
                        stroke={cluster.colors.light}
                        strokeWidth="8"
                        opacity="0.4"
                        className="animate-pulse"
                      />
                    )}
                    
                    {/* Shadow */}
                    <circle
                      cx={cluster.x + 2}
                      cy={cluster.y + 3}
                      r={cluster.radius}
                      fill="#00000015"
                      className="pointer-events-none"
                    />
                    
                    {/* Main cluster circle with gradient */}
                    <defs>
                      <radialGradient id={`grad-${cluster.cluster_id}`}>
                        <stop offset="0%" stopColor={cluster.colors.light} />
                        <stop offset="100%" stopColor={cluster.colors.fill} />
                      </radialGradient>
                    </defs>
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={cluster.radius}
                      fill={`url(#grad-${cluster.cluster_id})`}
                      stroke={isUserInCluster ? "#0d9488" : cluster.colors.stroke}
                      strokeWidth={isUserInCluster ? "5" : isHovered ? "3" : "2"}
                      className="cursor-pointer transition-all duration-300"
                      onMouseEnter={() => setHoveredCluster(cluster.cluster_id)}
                      onMouseLeave={() => setHoveredCluster(null)}
                      onClick={() => router.push(`/communities/${cluster.cluster_id}`)}
                      style={{ 
                        filter: isHovered ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.08))',
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                        transformOrigin: `${cluster.x}px ${cluster.y}px`
                      }}
                    />
                    
                    {/* Member count with background */}
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={cluster.radius * 0.4}
                      fill="white"
                      opacity="0.9"
                      className="pointer-events-none"
                    />
                    <text
                      x={cluster.x}
                      y={cluster.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={cluster.colors.fill}
                      fontSize={Math.min(32, cluster.radius * 0.5)}
                      fontWeight="bold"
                      className="pointer-events-none"
                    >
                      {cluster.member_count}
                    </text>
                    
                    {/* Label below (always show, not just on hover) */}
                    <text
                      x={cluster.x}
                      y={cluster.y + cluster.radius + 20}
                      textAnchor="middle"
                      fill="#57534e"
                      fontSize="13"
                      fontWeight="600"
                      className="pointer-events-none"
                    >
                      {cluster.label.length > 25 ? cluster.label.substring(0, 25) + '...' : cluster.label}
                    </text>
                    
                    {/* User's cluster indicator */}
                    {isUserInCluster && (
                      <text
                        x={cluster.x}
                        y={cluster.y + cluster.radius + 38}
                        textAnchor="middle"
                        fill="#0d9488"
                        fontSize="11"
                        fontWeight="700"
                        className="pointer-events-none"
                      >
                        ⭐ You're here
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            
            {/* Info Panel */}
            <div className="mt-6 pt-6 border-t border-stone-300">
              <div className="flex items-start gap-8">
                {/* Color Legend */}
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-stone-900 mb-3 uppercase tracking-wide">Domain Colors</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-sm"></div>
                      <span className="text-xs text-stone-700 font-medium">Climate/Ocean</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-sm"></div>
                      <span className="text-xs text-stone-700 font-medium">Health/Bio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm"></div>
                      <span className="text-xs text-stone-700 font-medium">AI/ML/Data</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm"></div>
                      <span className="text-xs text-stone-700 font-medium">Education</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-sm"></div>
                      <span className="text-xs text-stone-700 font-medium">Finance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-sm"></div>
                      <span className="text-xs text-stone-700 font-medium">Other</span>
                    </div>
                  </div>
                </div>
                
                {/* Instructions */}
                <div className="flex-1 bg-stone-100 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-stone-900 mb-2 uppercase tracking-wide">How to Use</h4>
                  <ul className="space-y-1.5 text-xs text-stone-700">
                    <li className="flex items-start gap-2">
                      <span className="text-stone-400">●</span>
                      <span><strong>Bubble size</strong> = number of members (larger = more people)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-stone-400">●</span>
                      <span><strong>Hover</strong> to highlight and scale up</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-stone-400">●</span>
                      <span><strong>Click</strong> any cluster to view members</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600">⭐</span>
                      <span><strong>Teal border</strong> = your cluster</span>
                    </li>
                  </ul>
                </div>
              </div>
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

