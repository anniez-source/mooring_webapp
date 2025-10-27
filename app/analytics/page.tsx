'use client';

import { useState, useEffect } from 'react';
import { useUser, SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function AnalyticsPage() {
  const { user, isLoaded } = useUser();
  const [themes, setThemes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThemes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/themes?org_id=null');
      if (res.ok) {
        const data = await res.json();
        setThemes(data);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to load themes');
      }
    } catch (error) {
      console.error('Failed to load themes:', error);
      setError('Failed to load themes');
    } finally {
      setLoading(false);
    }
  };

  const generateThemes = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/generate-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: null })
      });
      
      if (res.ok) {
        const data = await res.json();
        setThemes(data);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to generate themes');
      }
    } catch (error) {
      console.error('Failed to generate themes:', error);
      setError('Failed to generate themes');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      loadThemes();
    }
  }, [isLoaded, user]);

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      {/* Navigation */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <img src="/mooring-logo.svg" alt="Mooring" className="w-6 h-6" />
              <span className="text-2xl font-bold text-stone-900 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                Mooring
              </span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/chat" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                Find People
              </Link>
              <Link href="/saved" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                Saved
              </Link>
              <Link href="/profile" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
                Profile
              </Link>
              <Link href="/analytics" className="text-sm text-stone-900 font-medium">
                Analytics
              </Link>
              <SignOutButton>
                <button className="text-sm text-stone-600 hover:text-stone-900 transition-colors">Sign Out</button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">Community Intelligence</h1>
            <p className="text-stone-600">AI-powered thematic clustering analysis of your community</p>
          </div>
          <button
            onClick={generateThemes}
            disabled={generating}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {generating ? 'Analyzing...' : 'Regenerate Themes'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl p-12 text-center border border-stone-200">
            <div className="animate-pulse">
              <div className="h-4 bg-stone-200 rounded w-1/4 mx-auto mb-4"></div>
              <div className="h-4 bg-stone-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        )}

        {themes && !loading && (
          <>
            {/* Stats */}
            <div className="bg-white rounded-xl p-6 mb-6 border border-stone-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-stone-500 mb-1">Last Updated</div>
                  <div className="text-lg font-semibold text-stone-900">
                    {new Date(themes.generated_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-stone-500 mb-1">Profiles Analyzed</div>
                  <div className="text-lg font-semibold text-stone-900">
                    {themes.member_count} members
                  </div>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            {themes.themes.insights && themes.themes.insights.length > 0 && (
              <div className="bg-teal-50 rounded-xl p-6 mb-6 border border-teal-200">
                <h2 className="text-xl font-semibold text-stone-900 mb-4">🔍 Key Insights</h2>
                <ul className="space-y-3">
                  {themes.themes.insights.map((insight: string, idx: number) => (
                    <li key={idx} className="text-stone-700 flex items-start gap-2">
                      <span className="text-teal-600 font-bold">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Theme Clusters */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-stone-900">Community Themes</h2>
              
              {themes.themes.themes.map((theme: any, idx: number) => (
                <div key={idx} className="bg-white rounded-xl p-6 border border-stone-200 hover:border-teal-200 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-stone-900">{theme.name}</h3>
                    <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                      {theme.member_count} members
                    </span>
                  </div>
                  
                  <p className="text-stone-600 mb-4 leading-relaxed">{theme.description}</p>
                  
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <h4 className="font-medium text-stone-700 mb-2 text-sm uppercase tracking-wide">Common Backgrounds</h4>
                      <ul className="text-sm text-stone-600 space-y-1">
                        {theme.common_backgrounds.map((bg: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-teal-600 mt-1">•</span>
                            <span>{bg}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-stone-700 mb-2 text-sm uppercase tracking-wide">Common Needs</h4>
                      <ul className="text-sm text-stone-600 space-y-1">
                        {theme.common_needs.map((need: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-teal-600 mt-1">•</span>
                            <span>{need}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-stone-700 mb-2 text-sm uppercase tracking-wide">Common Offerings</h4>
                      <ul className="text-sm text-stone-600 space-y-1">
                        {theme.common_offerings.map((offering: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-teal-600 mt-1">•</span>
                            <span>{offering}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-4">
                    <h4 className="font-medium text-stone-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">💡</span>
                      <span>Recommendation</span>
                    </h4>
                    <p className="text-sm text-stone-700 leading-relaxed">{theme.recommendation}</p>
                  </div>

                  <details className="group">
                    <summary className="cursor-pointer text-sm text-teal-600 hover:text-teal-700 font-medium list-none flex items-center gap-2">
                      <span className="group-open:rotate-90 transition-transform">▶</span>
                      View members in this cluster
                    </summary>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {theme.member_names.map((name: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-sm">
                          {name}
                        </span>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </>
        )}

        {!themes && !loading && !error && (
          <div className="bg-white rounded-xl p-12 text-center border border-stone-200">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🧩</span>
              </div>
              <h3 className="text-xl font-semibold text-stone-900 mb-2">No Themes Generated Yet</h3>
              <p className="text-stone-600 mb-6">
                Generate AI-powered thematic clusters to understand your community's composition and identify opportunities.
              </p>
              <button
                onClick={generateThemes}
                disabled={generating}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors"
              >
                {generating ? 'Analyzing...' : 'Generate Community Themes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

