'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CommunitiesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200/50">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/communities" className="text-sm text-gray-900 font-medium">Communities</Link>
              <Link href="/chat" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Find People</Link>
              <Link href="/saved" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Saved</Link>
              <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Profile</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Communities</h1>
        <p className="text-lg text-gray-600">Coming soon...</p>
      </div>
    </div>
  );
}

