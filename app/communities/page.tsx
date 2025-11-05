'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import UserProfileDropdown from '../components/UserProfileDropdown';
import { Users } from 'lucide-react';

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
          const sortedClusters = (data.clusters || []).sort((a, b) => 
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
      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
            Communities
          </h1>
          <p className="text-stone-600">
            Discover clusters of people working on similar things in {orgName || 'your network'}.
          </p>
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
        ) : (
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

