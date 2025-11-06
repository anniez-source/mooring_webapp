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
    const width = 1200;
    const height = 700;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Sophisticated, muted color palette (Observable/NYT style)
    const colorPalette = {
      'climate': { base: '#0891b2', light: '#06b6d4', accent: '#67e8f9' },     // Cyan
      'health': { base: '#dc2626', light: '#ef4444', accent: '#fca5a5' },      // Rose
      'ai': { base: '#6366f1', light: '#818cf8', accent: '#a5b4fc' },          // Indigo
      'education': { base: '#f59e0b', light: '#fbbf24', accent: '#fcd34d' },   // Amber
      'finance': { base: '#10b981', light: '#34d399', accent: '#6ee7b7' },     // Emerald
      'other': { base: '#64748b', light: '#94a3b8', accent: '#cbd5e1' },       // Slate
    };
    
    // Find min and max member counts for relative scaling
    const memberCounts = clusters.map(c => c.member_count);
    const minMembers = Math.min(...memberCounts);
    const maxMembers = Math.max(...memberCounts);
    
    // Calculate keyword similarity for force-directed layout
    const getKeywordSimilarity = (c1: Cluster, c2: Cluster) => {
      const set1 = new Set(c1.keywords.map(k => k.toLowerCase()));
      const set2 = new Set(c2.keywords.map(k => k.toLowerCase()));
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      return intersection.size / Math.max(set1.size, set2.size);
    };
    
    // Assign domain and colors
    const clustersWithMeta = clusters.map(cluster => {
      const keywords = cluster.keywords.join(' ').toLowerCase();
      let domain = 'other';
      
      if (keywords.includes('climate') || keywords.includes('ocean') || keywords.includes('carbon')) {
        domain = 'climate';
      } else if (keywords.includes('health') || keywords.includes('bio') || keywords.includes('medical')) {
        domain = 'health';
      } else if (keywords.includes('ai') || keywords.includes('ml') || keywords.includes('data')) {
        domain = 'ai';
      } else if (keywords.includes('education') || keywords.includes('learning')) {
        domain = 'education';
      } else if (keywords.includes('finance') || keywords.includes('fintech')) {
        domain = 'finance';
      }
      
      // Proportional sizing (area-based, not radius)
      const minRadius = 50;
      const maxRadius = 140;
      const normalizedSize = minMembers === maxMembers ? 0.5 : 
        (cluster.member_count - minMembers) / (maxMembers - minMembers);
      
      // Use square root for area-based sizing (more accurate visual representation)
      const radius = minRadius + Math.sqrt(normalizedSize) * (maxRadius - minRadius);
      
      return { 
        ...cluster, 
        domain, 
        colors: colorPalette[domain as keyof typeof colorPalette],
        radius,
        x: centerX + (Math.random() - 0.5) * 400,
        y: centerY + (Math.random() - 0.5) * 300,
        vx: 0,
        vy: 0
      };
    });
    
    // Force-directed layout simulation (simplified, no library needed)
    const iterations = 50;
    const damping = 0.8;
    
    for (let iter = 0; iter < iterations; iter++) {
      // Reset forces
      clustersWithMeta.forEach(c => {
        c.vx = 0;
        c.vy = 0;
      });
      
      // Apply forces between all pairs
      for (let i = 0; i < clustersWithMeta.length; i++) {
        for (let j = i + 1; j < clustersWithMeta.length; j++) {
          const c1 = clustersWithMeta[i];
          const c2 = clustersWithMeta[j];
          
          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const similarity = getKeywordSimilarity(c1, c2);
          const sameDomain = c1.domain === c2.domain;
          
          // Attraction: similar clusters attract
          const attractionStrength = similarity * (sameDomain ? 0.3 : 0.1);
          const attraction = attractionStrength * distance;
          
          // Repulsion: prevent heavy overlap (but allow some)
          const minDist = (c1.radius + c2.radius) * 0.7; // 0.7 = allow 30% overlap
          const repulsion = distance < minDist ? (minDist - distance) * 0.5 : 0;
          
          const force = (attraction - repulsion) / distance;
          const fx = dx * force;
          const fy = dy * force;
          
          c1.vx += fx;
          c1.vy += fy;
          c2.vx -= fx;
          c2.vy -= fy;
        }
      }
      
      // Apply center gravity
      clustersWithMeta.forEach(c => {
        const dx = centerX - c.x;
        const dy = centerY - c.y;
        c.vx += dx * 0.01;
        c.vy += dy * 0.01;
      });
      
      // Update positions with damping
      clustersWithMeta.forEach(c => {
        c.x += c.vx * damping;
        c.y += c.vy * damping;
        
        // Soft boundaries
        const margin = c.radius + 40;
        if (c.x < margin) c.x = margin;
        if (c.x > width - margin) c.x = width - margin;
        if (c.y < margin) c.y = margin;
        if (c.y > height - margin) c.y = height - margin;
      });
    }
    
    return clustersWithMeta;
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200/50">
            <svg viewBox="0 0 1200 700" className="w-full" style={{ maxHeight: '700px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              {/* Clean background */}
              <rect width="1200" height="700" fill="#fafaf9" />
              
              {/* Define filters and gradients */}
              <defs>
                {/* Sophisticated shadow */}
                <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.15"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                
                {/* Subtle inner shadow */}
                <filter id="innerGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                  <feOffset in="blur" dx="0" dy="0"/>
                </filter>
                
                {/* Radial gradients for each cluster */}
                {clusterData.map((cluster) => (
                  <radialGradient key={`grad-${cluster.cluster_id}`} id={`grad-${cluster.cluster_id}`} cx="35%" cy="35%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
                    <stop offset="40%" stopColor={cluster.colors.light} stopOpacity="0.7"/>
                    <stop offset="100%" stopColor={cluster.colors.base} stopOpacity="0.85"/>
                  </radialGradient>
                ))}
              </defs>
              
              {/* Cluster circles */}
              {clusterData.map((cluster) => {
                const isHovered = hoveredCluster === cluster.cluster_id;
                const isUserInCluster = currentUserId && cluster.member_ids.includes(currentUserId);
                
                return (
                  <g key={cluster.cluster_id}>
                    {/* Hover glow effect */}
                    {isHovered && (
                      <circle
                        cx={cluster.x}
                        cy={cluster.y}
                        r={cluster.radius + 12}
                        fill={cluster.colors.accent}
                        opacity="0.2"
                      />
                    )}
                    
                    {/* Main circle with gradient and soft shadow */}
                    <circle
                      cx={cluster.x}
                      cy={cluster.y}
                      r={cluster.radius}
                      fill={`url(#grad-${cluster.cluster_id})`}
                      stroke={isUserInCluster ? "#0891b2" : "#ffffff"}
                      strokeWidth={isUserInCluster ? "3" : "2"}
                      opacity={isHovered ? "0.95" : "0.85"}
                      filter="url(#softShadow)"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredCluster(cluster.cluster_id)}
                      onMouseLeave={() => setHoveredCluster(null)}
                      onClick={() => router.push(`/communities/${cluster.cluster_id}`)}
                    />
                    
                    {/* Member count */}
                    <text
                      x={cluster.x}
                      y={cluster.y + 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={cluster.colors.base}
                      fontSize={Math.min(42, cluster.radius * 0.6)}
                      fontWeight="600"
                      opacity="0.9"
                      className="pointer-events-none"
                      style={{ letterSpacing: '-0.02em' }}
                    >
                      {cluster.member_count}
                    </text>
                    
                    {/* Label - clean typography */}
                    <text
                      x={cluster.x}
                      y={cluster.y + cluster.radius + 22}
                      textAnchor="middle"
                      fill="#1c1917"
                      fontSize="14"
                      fontWeight="500"
                      opacity="0.8"
                      className="pointer-events-none"
                      style={{ letterSpacing: '-0.01em' }}
                    >
                      {cluster.label.length > 30 ? cluster.label.substring(0, 30) + '...' : cluster.label}
                    </text>
                    
                    {/* User indicator - minimal */}
                    {isUserInCluster && (
                      <circle
                        cx={cluster.x + cluster.radius - 15}
                        cy={cluster.y - cluster.radius + 15}
                        r="6"
                        fill="#0891b2"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="pointer-events-none"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
            
            {/* Minimal legend */}
            <div className="mt-6 pt-4 border-t border-stone-200/60">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <div className="flex items-center gap-6">
                  <span className="font-medium text-stone-700">Domains:</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#0891b2' }}></div>
                      <span>Climate</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#dc2626' }}></div>
                      <span>Health</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#6366f1' }}></div>
                      <span>AI/ML</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }}></div>
                      <span>Education</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: '#10b981' }}></div>
                      <span>Finance</span>
                    </div>
                  </div>
                </div>
                <div className="text-stone-400">
                  Circle size = members · Similar clusters overlap
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

