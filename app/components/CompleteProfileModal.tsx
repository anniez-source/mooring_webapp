'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CompleteProfileModal() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!isLoaded) {
        return;
      }

      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('clerk_user_id', user.id)
          .single();

        if (userError || !userData) {
          setShowModal(true);
          setIsChecking(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('background, interests, expertise')
          .eq('user_id', userData.user_id)
          .single();

        if (profileError || !profileData) {
          setShowModal(true);
          setIsChecking(false);
          return;
        }

        // Check if required fields are filled (minimum 100 characters each)
        const hasBackground = profileData.background && 
                             profileData.background !== 'Profile incomplete' && 
                             profileData.background.length >= 100;
        const hasInterests = profileData.interests && 
                            profileData.interests !== 'Profile incomplete' && 
                            profileData.interests.length >= 100;
        const hasExpertise = profileData.expertise && 
                            profileData.expertise !== 'Profile incomplete' && 
                            profileData.expertise.length >= 100;

        const isProfileComplete = hasBackground && hasInterests && hasExpertise;

        setShowModal(!isProfileComplete);
        setIsChecking(false);
      } catch (error) {
        console.error('Error checking profile:', error);
        setShowModal(true);
        setIsChecking(false);
      }
    };

    checkProfileCompletion();
  }, [user, isLoaded]);

  const handleCompleteProfile = () => {
    router.push('/profile');
  };

  if (isChecking || !showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-3" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
              Complete Your Profile
            </h2>
            <p className="text-stone-600 leading-relaxed" style={{ lineHeight: '1.6' }}>
              You need to complete your profile before you can search for connections and opportunities.
            </p>
          </div>
          
          <button
            onClick={handleCompleteProfile}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3.5 px-6 rounded-lg transition-colors duration-150"
          >
            Complete Profile
          </button>
        </div>
      </div>
    </div>
  );
}

