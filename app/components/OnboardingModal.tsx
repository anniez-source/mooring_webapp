'use client';

import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useSupabaseClient } from '@/lib/supabase-client';

export default function OnboardingModal() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [currentWork, setCurrentWork] = useState('');
  const [expertiseOffering, setExpertiseOffering] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [canOffer, setCanOffer] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const lookingForOptions = [
    'A cofounder',
    'Domain expertise',
    'Introductions',
    'Mentorship'
  ];

  const canOfferOptions = [
    'Being a cofounder for the right fit',
    'Providing domain expertise',
    'Making introductions',
    'Mentoring'
  ];

  const toggleLookingFor = (option: string) => {
    setLookingFor(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const toggleCanOffer = (option: string) => {
    setCanOffer(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        setErrors(['Please upload a JPG or PNG image']);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!isLoaded) {
        console.log('[OnboardingModal] Clerk not loaded yet');
        return;
      }

      if (!user) {
        console.log('[OnboardingModal] User not logged in, hiding modal');
        setIsAuthenticated(false);
        setShowModal(false);
        setIsChecking(false);
        return;
      }

      console.log('[OnboardingModal] Checking profile for user:', user.id);
      setIsAuthenticated(true);

      try {
        // First get the user_id from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('clerk_user_id', user.id)
          .single();

        if (userError || !userData) {
          console.log('[OnboardingModal] User not found in database (new user), showing modal');
          // This is expected for new users - they don't exist in database until they complete onboarding
          // User doesn't exist yet, show modal
          setShowModal(true);
          setIsChecking(false);
          return;
        }

        console.log('[OnboardingModal] Found user_id:', userData.user_id);

        // Then check profile completion
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('background, expertise, looking_for, open_to, opted_in')
          .eq('user_id', userData.user_id)
          .single();

        if (profileError) {
          // Profile doesn't exist yet - show modal
          console.log('[OnboardingModal] Profile not found, showing modal');
          setShowModal(true);
          setIsChecking(false);
          return;
        }

        console.log('[OnboardingModal] Profile data:', profileData);

        // Only show modal if user has NEVER filled out their profile
        // (If they skipped before, don't show it again)
        const hasNeverCompletedProfile = !profileData?.background && 
                                         !profileData?.expertise;
        
        console.log('[OnboardingModal] Has never completed profile?', hasNeverCompletedProfile);
        setShowModal(hasNeverCompletedProfile);
        setIsChecking(false);
      } catch (error) {
        console.error('[OnboardingModal] Error checking profile:', error);
        // On error, show modal to be safe
        setShowModal(true);
        setIsChecking(false);
      }
    };

    checkProfileCompletion();
  }, [user, isLoaded]);

  const validate = () => {
    const newErrors: string[] = [];
    if (currentWork.length < 150) {
      newErrors.push('Please describe your background (minimum 150 characters)');
    }
    if (expertiseOffering.length < 150) {
      newErrors.push('Please describe your expertise (minimum 150 characters)');
    }
    if (lookingFor.length === 0) {
      newErrors.push('Please select at least one thing you\'re looking for');
    }
    if (canOffer.length === 0) {
      newErrors.push('Please select at least one thing you can offer');
    }
    if (!consent) {
      newErrors.push('Please consent to being included in matching results');
    }
    if (linkedinUrl && !linkedinUrl.match(/^https?:\/\/(www\.)?linkedin\.com\/.+/i)) {
      newErrors.push('Please enter a valid LinkedIn URL');
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setShowValidation(true);

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!user) return;

    setIsSubmitting(true);

    try {
      console.log('[OnboardingModal] Starting profile save for user:', user.id);
      
      // First get the user_id from users table
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, name, email')
        .eq('clerk_user_id', user.id)
        .single();

      console.log('[OnboardingModal] User lookup result:', { userData, userError });

      // If user doesn't exist, create them first
      if (userError || !userData) {
        console.log('[OnboardingModal] User not found, creating user record...');
        
        const newUserData = {
          clerk_user_id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          name: user.fullName || user.firstName || 'User'
        };

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert(newUserData)
          .select('user_id, name, email')
          .single();

        if (createError) {
          console.error('[OnboardingModal] Failed to create user. Full error:', {
            message: createError.message,
            details: createError.details,
            hint: createError.hint,
            code: createError.code
          });
          
          // If it's a duplicate key error, try to fetch the existing user
          if (createError.code === '23505') {
            console.log('[OnboardingModal] User already exists, fetching existing user...');
            const { data: existingUser, error: fetchError } = await supabase
              .from('users')
              .select('user_id, name, email')
              .eq('clerk_user_id', user.id)
              .single();
            
            if (existingUser) {
              console.log('[OnboardingModal] Found existing user:', existingUser);
              userData = existingUser;
            } else {
              throw new Error(`Database error: ${createError.message}`);
            }
          } else {
            throw new Error(`Database error: ${createError.message}`);
          }
        } else {
          console.log('[OnboardingModal] User created successfully:', newUser);
          userData = newUser;
        }
      }

      const profileData: any = {
        user_id: userData.user_id,
        name: userData.name,
        email: userData.email,
        background: currentWork,
        expertise: expertiseOffering,
        looking_for: lookingFor,
        open_to: canOffer,
        opted_in: consent,
        updated_at: new Date().toISOString()
      };

      if (linkedinUrl) {
        profileData.linkedin_url = linkedinUrl;
      }
      if (profilePicture) {
        profileData.profile_picture = profilePicture;
      }

      console.log('[OnboardingModal] Profile data to save:', {
        user_id: profileData.user_id,
        name: profileData.name,
        email: profileData.email,
        background_length: profileData.background?.length,
        expertise_length: profileData.expertise?.length,
        looking_for: profileData.looking_for,
        open_to: profileData.open_to,
        opted_in: profileData.opted_in
      });

      // Use upsert to insert or update
      const { data: upsertData, error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        })
        .select();

      console.log('[OnboardingModal] Upsert result:', { upsertData, upsertError });

      if (upsertError) {
        console.error('[OnboardingModal] Database error details:', {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint
        });
        throw upsertError;
      }

      console.log('[OnboardingModal] Profile saved successfully!');
      
      // Close modal and refresh
      setShowModal(false);
      router.refresh();
    } catch (error: any) {
      console.error('[OnboardingModal] Error saving profile:', error);
      setErrors([error.message || 'Failed to save profile. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    currentWork.length >= 150 &&
    expertiseOffering.length >= 150 &&
    lookingFor.length > 0 &&
    canOffer.length > 0 &&
    consent;

  const handleSkip = async () => {
    if (!user) return;
    
    try {
      console.log('[OnboardingModal] User skipped onboarding');
      
      // Get or create user
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, name, email')
        .eq('clerk_user_id', user.id)
        .single();

      if (userError || !userData) {
        const newUserData = {
          clerk_user_id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          name: user.fullName || user.firstName || 'User'
        };

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert(newUserData)
          .select('user_id, name, email')
          .single();

        if (createError && createError.code !== '23505') {
          console.error('[OnboardingModal] Error creating user for skip:', createError);
          return;
        }
        
        if (newUser) userData = newUser;
      }

      if (!userData) return;

      // Create minimal profile (not opted in)
      const minimalProfile = {
        user_id: userData.user_id,
        name: userData.name,
        email: userData.email,
        background: 'Profile incomplete',
        expertise: 'Profile incomplete',
        looking_for: [],
        open_to: [],
        opted_in: false
      };

      await supabase
        .from('profiles')
        .upsert(minimalProfile, { onConflict: 'user_id' });

      console.log('[OnboardingModal] Minimal profile created, user can explore platform');
      
      // Close modal and refresh
      setShowModal(false);
      router.refresh();
    } catch (error) {
      console.error('[OnboardingModal] Error skipping onboarding:', error);
    }
  };

  // Don't show modal if checking, not logged in, user not authenticated, or user explicitly dismissed it
  if (isChecking || !isAuthenticated || !user || !showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-10 py-6 rounded-t-2xl">
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight" style={{ fontFamily: 'var(--font-ibm-plex)', fontWeight: 600 }}>
            Complete Your Profile
          </h1>
          <p className="text-sm text-stone-600 mt-2">
            Help us understand who you are and what you're looking for
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-12">
          {/* Optional Profile Fields */}
          <div className="space-y-6 pb-8 border-b border-stone-200">
            {/* Profile Photo Upload */}
            <div>
              <label className="block text-xs mb-2 text-stone-500">
                Profile photo <span className="text-stone-400">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                {profilePicture && (
                  <img src={profilePicture} alt="Profile preview" className="w-12 h-12 rounded-full object-cover border border-stone-200" />
                )}
                <label
                  htmlFor="profile-picture"
                  className="px-3 py-2 text-xs border border-stone-200 rounded-lg cursor-pointer hover:border-stone-300 transition-colors text-stone-700 bg-white"
                >
                  {profilePicture ? 'Change photo' : 'Choose file'}
                </label>
                <input
                  type="file"
                  id="profile-picture"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                />
                {profilePicture && (
                  <span className="text-xs text-stone-400">JPG or PNG</span>
                )}
              </div>
            </div>

            {/* LinkedIn URL */}
            <div>
              <label className="block text-xs mb-2 text-stone-500">
                LinkedIn Profile <span className="text-stone-400">(optional)</span>
              </label>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-0 text-sm text-stone-900 placeholder:text-stone-400 transition-colors"
                style={{ boxShadow: 'none' }}
                placeholder="https://linkedin.com/in/yourname"
              />
            </div>
          </div>

          {/* About You Section */}
          <div className="space-y-8">
            <h2 className="text-lg font-semibold text-stone-800" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
              About You
            </h2>
            {/* What's your background */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#4B5563' }}>
                What's your background? What have you built or worked on?
              </label>
              <textarea
                value={currentWork}
                onChange={(e) => setCurrentWork(e.target.value)}
                rows={5}
                className={`w-full px-4 py-3.5 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[140px] transition-colors ${
                  showValidation && currentWork.length < 150
                    ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                    : 'border-stone-200 focus:border-teal-600'
                }`}
                style={{ boxShadow: 'none', lineHeight: '1.6' }}
                placeholder="e.g., Product manager at HubSpot for 4 years, shipped features used by 10k+ customers, worked across design and engineering teams..."
              />
              <p className={`mt-2 ${currentWork.length >= 150 ? 'text-teal-600' : showValidation && currentWork.length < 150 ? 'text-red-600' : 'text-stone-400'}`} style={{ fontSize: '11px' }}>
                {currentWork.length}/150 minimum
              </p>
            </div>

            {/* What expertise do you have */}
            <div>
              <label className="block text-sm mb-2" style={{ color: '#4B5563' }}>
                What expertise do you have to offer?
              </label>
              <textarea
                value={expertiseOffering}
                onChange={(e) => setExpertiseOffering(e.target.value)}
                rows={5}
                className={`w-full px-4 py-3.5 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[140px] transition-colors ${
                  showValidation && expertiseOffering.length < 150
                    ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                    : 'border-stone-200 focus:border-teal-600'
                }`}
                style={{ boxShadow: 'none', lineHeight: '1.6' }}
                placeholder="e.g., Climate tech and carbon markets, energy policy, product strategy, user research..."
              />
              <p className={`mt-2 ${expertiseOffering.length >= 150 ? 'text-teal-600' : showValidation && expertiseOffering.length < 150 ? 'text-red-600' : 'text-stone-400'}`} style={{ fontSize: '11px' }}>
                {expertiseOffering.length}/150 minimum
              </p>
            </div>
          </div>

          {/* Checkbox Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* I'm looking for */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-800 mb-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                  I'm looking for
                </h2>
                <p className={`text-xs ${showValidation && lookingFor.length === 0 ? 'text-red-600 font-medium' : 'text-stone-500'}`}>
                  Select at least one
                </p>
              </div>
              <div className="space-y-2.5">
                {lookingForOptions.map((option) => (
                  <label
                    key={option}
                    className={`
                      group relative flex items-center gap-3.5 px-4 py-4 
                      rounded-lg cursor-pointer transition-all duration-200
                      ${lookingFor.includes(option)
                        ? 'bg-teal-50 border-2 border-teal-500 shadow-sm'
                        : showValidation && lookingFor.length === 0
                        ? 'bg-white border-2 border-red-200 hover:border-red-300 hover:bg-red-50/30'
                        : 'bg-white border-2 border-stone-200 hover:border-teal-400 hover:bg-teal-50/30 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-center justify-center flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={lookingFor.includes(option)}
                        onChange={() => toggleLookingFor(option)}
                        className="h-5 w-5 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded border-stone-300 cursor-pointer transition-all"
                      />
                    </div>
                    <span className={`text-sm font-medium flex-1 ${
                      lookingFor.includes(option) ? 'text-teal-900' : 'text-stone-700 group-hover:text-stone-900'
                    }`}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
              {showValidation && lookingFor.length === 0 && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                  <span>⚠</span>
                  <span>Please select at least one option</span>
                </p>
              )}
            </div>

            {/* I'm open to */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-800 mb-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                  I'm open to
                </h2>
                <p className={`text-xs ${showValidation && canOffer.length === 0 ? 'text-red-600 font-medium' : 'text-stone-500'}`}>
                  Select at least one
                </p>
              </div>
              <div className="space-y-2.5">
                {canOfferOptions.map((option) => (
                  <label
                    key={option}
                    className={`
                      group relative flex items-center gap-3.5 px-4 py-4 
                      rounded-lg cursor-pointer transition-all duration-200
                      ${canOffer.includes(option)
                        ? 'bg-teal-50 border-2 border-teal-500 shadow-sm'
                        : showValidation && canOffer.length === 0
                        ? 'bg-white border-2 border-red-200 hover:border-red-300 hover:bg-red-50/30'
                        : 'bg-white border-2 border-stone-200 hover:border-teal-400 hover:bg-teal-50/30 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-center justify-center flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={canOffer.includes(option)}
                        onChange={() => toggleCanOffer(option)}
                        className="h-5 w-5 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 rounded border-stone-300 cursor-pointer transition-all"
                      />
                    </div>
                    <span className={`text-sm font-medium flex-1 ${
                      canOffer.includes(option) ? 'text-teal-900' : 'text-stone-700 group-hover:text-stone-900'
                    }`}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
              {showValidation && canOffer.length === 0 && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                  <span>⚠</span>
                  <span>Please select at least one option</span>
                </p>
              )}
            </div>
          </div>

          {/* Consent Checkbox */}
          <div>
            <label className="flex items-start cursor-pointer group">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-600 rounded border-stone-300"
              />
              <span className="ml-3 text-sm text-stone-700">
                I consent to being included in matching results
              </span>
            </label>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="px-6 py-3.5 rounded-lg font-medium text-sm border-2 border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-all"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              style={{
                backgroundColor: isFormValid && !isSubmitting ? '#0D9488' : '#E7E5E4',
                color: isFormValid && !isSubmitting ? 'white' : '#A8A29E'
              }}
              className={`flex-1 py-3.5 px-6 rounded-lg font-medium text-sm transition-all ${
                isFormValid && !isSubmitting
                  ? 'hover:opacity-90 shadow-sm cursor-pointer'
                  : 'cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
          
          <p className="text-xs text-stone-500 text-center -mt-4">
            You can complete your profile later from Settings. Only complete profiles appear in AI matching.
          </p>
        </form>
      </div>
    </div>
  );
}

