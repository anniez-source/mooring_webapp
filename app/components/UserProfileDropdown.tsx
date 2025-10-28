'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { SignOutButton } from '@clerk/nextjs';
import { ChevronDown, LogOut } from 'lucide-react';

export default function UserProfileDropdown() {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const getInitial = () => {
    console.log('[UserProfileDropdown] User data:', {
      firstName: user?.firstName,
      fullName: user?.fullName,
      emailAddress: user?.primaryEmailAddress?.emailAddress,
      imageUrl: user?.imageUrl
    });
    
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user?.fullName) {
      return user.fullName.charAt(0).toUpperCase();
    }
    if (user?.primaryEmailAddress?.emailAddress) {
      return user.primaryEmailAddress.emailAddress.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    return user.fullName || user.firstName || 'User';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {user.hasImage && user.imageUrl && !user.imageUrl.includes('default') ? (
          <img
            src={user.imageUrl}
            alt={getUserName()}
            className="w-8 h-8 rounded-full object-cover border-2 border-stone-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
            <span className="text-white text-sm font-medium">{getInitial()}</span>
          </div>
        )}
        <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg border border-stone-200 shadow-lg z-[100]" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
          {/* User Info */}
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-sm font-medium text-stone-900">{getUserName()}</p>
            <p className="text-xs text-stone-500 truncate">{user.primaryEmailAddress?.emailAddress}</p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <SignOutButton>
              <button className="w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </SignOutButton>
          </div>
        </div>
      )}
    </div>
  );
}

