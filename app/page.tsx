'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, Users, BarChart, TrendingUp, Zap } from 'lucide-react';

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const logoColors = ['text-stone-900', 'text-amber-700', 'text-stone-600', 'text-stone-400'];
  const selectedColor = logoColors[Math.min(Math.floor(scrollY / 100), logoColors.length - 1)];
  
  const getStripeColor = () => {
    if (!selectedColor) return '#0D9488';
    if (selectedColor.includes('stone-900')) return '#0D9488';
    if (selectedColor.includes('amber')) return '#D97706';
    if (selectedColor.includes('stone-600')) return '#78716C';
    return '#A8A29E';
  };
  
  const bannerColors = ['bg-stone-900', 'bg-amber-700', 'bg-stone-600', 'bg-stone-400'];
  const selectedBannerColor = bannerColors[Math.min(Math.floor(scrollY / 100), bannerColors.length - 1)];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      {/* Navbar */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50 pt-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-20 items-center">
            <Link href="/" className="flex items-center -space-x-2">
              <img 
                src="/mooring-logo.svg" 
                alt="Mooring" 
                className="w-24 h-18"
                style={{
                  filter: `hue-rotate(${Math.floor(scrollY / 300) * 30}deg)`,
                  transition: 'filter 0.3s ease',
                }}
              />
              <span className="text-3xl font-bold text-stone-900 -ml-4" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
            <div className="hidden md:block">
              <div className="flex items-center space-x-8">
                <Link href="/" className="text-base text-stone-600 hover:text-stone-900 transition-colors font-sans">Home</Link>
                <Link href="/contact" className="text-base text-stone-600 hover:text-stone-900 transition-colors font-sans">Contact</Link>
                <Link href="/login" className="bg-teal-600 text-white px-5 py-2 rounded-lg text-base font-medium hover:bg-teal-700 transition-colors font-sans">Log In</Link>
              </div>
            </div>
          </div>
        </div>
        </nav>

      {/* Hero Section */}
      <header className="py-16 md:py-20 text-center">
        <div className="relative max-w-6xl mx-auto px-8">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight text-stone-900" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
            Your Members Can't Find Each Other.
          </h1>
          <p className="text-xl md:text-2xl text-stone-600 mb-8 max-w-3xl mx-auto leading-relaxed font-medium">
            Mooring fixes this with connection infrastructure for accelerators, universities, and innovation hubs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact" className="inline-flex items-center gap-3 bg-teal-600 text-white px-8 py-4 rounded-2xl text-base font-semibold tracking-wide hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              <span>Book a Demo</span>
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm border-2 border-teal-600 text-teal-600 px-8 py-4 rounded-2xl text-base font-semibold tracking-wide hover:bg-teal-600 hover:text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              <span>Learn More</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* The Challenge */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="text-4xl font-bold text-stone-900 mb-16 tracking-tight text-center" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
            Your Community's Potential Is Untapped
          </h2>
          
          <div className="grid grid-cols-3 gap-8">
            <div className="bg-white border-l-4 border-teal-600 rounded-xl p-8 shadow-sm">
              <p className="text-lg text-stone-700 leading-relaxed mb-4">
                Sarah's healthcare research needs Mike's machine learning expertise. Together, breakthrough insights.
              </p>
              <p className="text-lg text-stone-900 leading-relaxed font-medium">
                They're both at your university. They'll never collaborate.
              </p>
            </div>
            
            <div className="bg-white border-l-4 border-teal-600 rounded-xl p-8 shadow-sm">
              <p className="text-lg text-stone-700 leading-relaxed mb-4">
                The Python expert who could unstick your student's thesis? The policy connection that could amplify your researcher's impact?
              </p>
              <p className="text-lg text-stone-900 leading-relaxed font-medium">
                Hidden in plain sight.
              </p>
            </div>
            
            <div className="bg-white border-l-4 border-teal-600 rounded-xl p-8 shadow-sm">
              <p className="text-lg text-stone-700 leading-relaxed mb-4">
                The engineering solution to a biology problem. The design thinking for a tech challenge.
              </p>
              <p className="text-lg text-stone-900 leading-relaxed font-medium">
                Cross-disciplinary breakthroughs that never happen because discovery is broken.
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-2xl text-stone-900 font-medium">
              The talent is there.
            </p>
            <p className="text-2xl text-stone-900 font-bold mt-2">
              Discovery is broken.
            </p>
          </div>
        </div>
      </section>

      {/* How Mooring Works */}
      <section className="py-24 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="max-w-6xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-stone-900 mb-6 tracking-tight" style={{ fontFamily: 'var(--font-ibm-plex)' }}>How Mooring Works</h2>
            <p className="text-lg text-stone-600">For Your Community</p>
          </div>
          
          <div className="grid grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-stone-900 mb-3">Members Search, AI Matches</h3>
              <p className="text-stone-600 leading-relaxed">
                Describe who you need: 'React developer interested in climate' or 'healthcare AI mentor.' AI finds relevant people instantly based on skills, interests, and what they're working on. No Slack chaos. No manual intros.
              </p>
            </div>
            
            {/* Card 2 */}
            <div className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-stone-900 mb-3">Cluster Intelligence</h3>
              <p className="text-stone-600 leading-relaxed">
                Communities emerge organically: 23 people building climate solutions, 17 working on healthcare AI. Not categories you created—patterns Mooring detects. See what's actually forming in your network.
              </p>
            </div>
            
            {/* Card 3 */}
            <div className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-stone-900 mb-3">Network Visibility</h3>
              <p className="text-stone-600 leading-relaxed">
                Track connections, cluster growth, member engagement. Understand your network, don't just hope it works.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Communities */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="text-4xl font-bold text-stone-900 mb-6 tracking-tight text-center" style={{ fontFamily: 'var(--font-ibm-plex)' }}>Infrastructure Your Community Needs</h2>
          <p className="text-xl text-stone-600 max-w-3xl mx-auto text-center leading-relaxed mb-12 font-medium">
            At 200 members, manual introductions break. Slack becomes chaos. Directories don't work.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-stone-900 mb-3">Scales When You Can't</h3>
              <p className="text-stone-600 leading-relaxed">
                19,900 possible pairings in a 200-person community. You can't manually facilitate them all. Mooring can.
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-stone-900 mb-3">Lead With Data, Not Guesswork</h3>
              <p className="text-stone-600 leading-relaxed">
                Which clusters are growing? Where are the gaps? Should you add workshops, invite speakers, or let it develop naturally? Real-time intelligence to make strategic decisions about your community.
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-stone-900 mb-3">Essential Infrastructure</h3>
              <p className="text-stone-600 leading-relaxed">
                At scale, you can't manually connect everyone who should meet. Your time doesn't scale. Your memory doesn't scale. Infrastructure does.
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <Link href="/contact" className="inline-flex items-center gap-3 bg-teal-600 text-white px-10 py-5 rounded-2xl text-lg font-semibold tracking-wide hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              <span>Book a Demo</span>
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="py-12 bg-white/30 backdrop-blur-sm border-t border-white/40">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <p className="text-stone-600 font-medium">&copy; {new Date().getFullYear()} Mooring. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
