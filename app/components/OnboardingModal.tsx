'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Lightbulb, Coffee, MessageSquare, Users, Ban } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OnboardingModal() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [background, setBackground] = useState('');
  const [interests, setInterests] = useState('');
  const [expertise, setExpertise] = useState('');
  const [howIHelp, setHowIHelp] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

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

  const toggleHowIHelp = (value: string) => {
    setHowIHelp(prev => {
      if (prev.includes(value)) {
        // Uncheck the clicked value
        return prev.filter(item => item !== value);
      } else {
        // If clicking "not_available", clear all other selections
        if (value === 'not_available') {
          return ['not_available'];
        }
        // If clicking anything else, remove "not_available" and add the new value
        return [...prev.filter(item => item !== 'not_available'), value];
      }
    });
  };

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!isLoaded) {
        return;
      }

      if (!user) {
        setIsAuthenticated(false);
        setShowModal(false);
        setIsChecking(false);
        return;
      }

      setIsAuthenticated(true);

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

        const { data: profileData, error: profileError} = await supabase
          .from('profiles')
          .select('background, interests, expertise, opted_in')
          .eq('user_id', userData.user_id)
          .single();

        if (profileError) {
          console.log('[Onboarding] Profile error:', profileError);
          setShowModal(true);
          setIsChecking(false);
          return;
        }

        console.log('[Onboarding] Profile data:', {
          hasBackground: !!profileData?.background,
          hasInterests: !!profileData?.interests,
          hasExpertise: !!profileData?.expertise,
          bgLength: profileData?.background?.length,
          intLength: profileData?.interests?.length,
          expLength: profileData?.expertise?.length
        });

        const hasIncompleteProfile = 
          !profileData?.background || 
          !profileData?.interests ||
          !profileData?.expertise ||
          profileData?.background === 'Profile incomplete' ||
          profileData?.interests === 'Profile incomplete' ||
          profileData?.expertise === 'Profile incomplete' ||
          profileData?.background.length < 100 ||
          profileData?.interests.length < 100 ||
          profileData?.expertise.length < 100;
        
        console.log('[Onboarding] Show modal?', hasIncompleteProfile);
        setShowModal(hasIncompleteProfile);
        setIsChecking(false);
      } catch (error) {
        setShowModal(true);
        setIsChecking(false);
      }
    };

    checkProfileCompletion();
  }, [user, isLoaded]);

  const validateStep = (step: number) => {
    const newErrors: string[] = [];
    
    if (step === 1) {
      if (!background || background.trim().length < 100) {
        newErrors.push('Please share your story (at least 100 characters)');
      }
    }
    
    if (step === 2) {
      if (!interests || interests.trim().length < 100) {
        newErrors.push('Please share what problems you\'re obsessed with (at least 100 characters)');
      }
    }
    
    if (step === 3) {
      if (!expertise || expertise.trim().length < 100) {
        newErrors.push('Please share your expertise (at least 100 characters)');
      }
    }
    
    // Step 4 and 5 have no required fields - all optional
    
    return newErrors;
  };

  const handleNext = () => {
    setShowValidation(true);
    const stepErrors = validateStep(currentStep);
    
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }
    
    setErrors([]);
    setShowValidation(false);
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setErrors([]);
    setShowValidation(false);
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setShowValidation(true);

    const stepErrors = validateStep(currentStep);
    if (stepErrors.length > 0) {
      setErrors(stepErrors);
      return;
    }

    if (!user) return;
    setIsSubmitting(true);

    try {
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
          throw new Error(`Database error: ${createError.message}`);
        }
        
        if (newUser) {
          userData = newUser;
        } else {
          const { data: existingUser } = await supabase
            .from('users')
            .select('user_id, name, email')
            .eq('clerk_user_id', user.id)
            .single();
          if (existingUser) userData = existingUser;
        }
      }

      if (!userData) throw new Error('Failed to get user data');

      const profileData: any = {
        user_id: userData.user_id,
        name: userData.name,
        email: userData.email,
        background: background,
        interests: interests,
        expertise: expertise,
        how_i_help: howIHelp,
        opted_in: true, // Auto-set to true when completing profile
        updated_at: new Date().toISOString()
      };

      if (linkedinUrl) {
        profileData.linkedin_url = linkedinUrl;
      }
      if (profilePicture) {
        profileData.profile_picture = profilePicture;
      }

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;

      // Generate embedding for the profile
      try {
        await fetch('/api/generate-embedding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userData.user_id })
        });
      } catch (embeddingError) {
        console.error('Error generating embedding:', embeddingError);
        // Don't fail the profile save if embedding generation fails
      }

      setShowModal(false);
      router.refresh();
    } catch (error: any) {
      setErrors([error.message || 'Failed to save profile. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    if (currentStep === 1) return background.trim().length >= 100;
    if (currentStep === 2) return interests.trim().length >= 100;
    if (currentStep === 3) return expertise.trim().length >= 100;
    if (currentStep === 4) return true; // No required fields
    if (currentStep === 5) return true; // All optional
    return false;
  };

  const handleSkip = async () => {
    if (!user) return;
    
    try {
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
          return;
        }
        
        if (newUser) userData = newUser;
      }

      if (!userData) return;

      const minimalProfile = {
        user_id: userData.user_id,
        name: userData.name,
        email: userData.email,
        background: 'Profile incomplete',
        current_work: 'Profile incomplete',
        expertise: 'Profile incomplete',
        help_offered: [],
        help_details: null,
        consent_to_matching: false,
        profile_completed: false
      };

      await supabase
        .from('profiles')
        .upsert(minimalProfile, { onConflict: 'user_id' });

      setShowModal(false);
      router.refresh();
    } catch (error) {
      console.error('[OnboardingModal] Error skipping onboarding:', error);
    }
  };

  if (isChecking || !isAuthenticated || !user || !showModal) {
    return null;
  }

  const getStepTitle = () => {
    if (currentStep === 1) return "Your Story";
    if (currentStep === 2) return "Your Obsessions";
    if (currentStep === 3) return "Your Strengths";
    if (currentStep === 4) return "How You Can Help";
    if (currentStep === 5) return "Photo & LinkedIn (Optional)";
    return "";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-8 py-5 z-10 rounded-t-2xl">
          <h1 className="text-xl font-bold text-stone-900 mb-1" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
            Complete Your Profile
          </h1>
          <p className="text-xs text-stone-500 mb-3">
            Step {currentStep} of {totalSteps}
          </p>
          {/* Single continuous progress bar */}
          <div className="h-0.5 bg-stone-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-300 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 bg-white rounded-b-2xl">
          {/* Step 1: Your Story */}
          {currentStep === 1 && (
            <div className="h-[400px] overflow-y-auto pr-2">
              <div>
                <label className="block text-xl font-bold text-stone-900 mb-4" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                  What's your story? Brag a little.
                </label>

                <textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200/40 resize-none text-base text-stone-900 placeholder:text-stone-400 transition-all ${
                    showValidation && background.trim().length < 100
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                      : 'border-stone-300 focus:border-stone-900 hover:border-stone-400'
                  }`}
                  style={{ lineHeight: '1.6' }}
                  placeholder='Ex: "8 years at Google and Stripe building payments infrastructure" or "Practicing cardiologist, now building remote monitoring tools" or "Founded two startups - one acquired for $50M"'
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-stone-400">Minimum 100 characters</p>
                  <p className="text-xs text-stone-500 tabular-nums">{background.length} / 100</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: What You Think About */}
          {currentStep === 2 && (
            <div className="h-[400px] overflow-y-auto pr-2">
              <div>
                <label className="block text-xl font-bold text-stone-900 mb-4" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                  What problems are you obsessed with?
                </label>

                <textarea
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200/40 resize-none text-base text-stone-900 placeholder:text-stone-400 transition-all ${
                    showValidation && interests.trim().length < 100
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                      : 'border-stone-300 focus:border-stone-900 hover:border-stone-400'
                  }`}
                  style={{ lineHeight: '1.6' }}
                  placeholder='Ex: "Making carbon markets actually work at scale" or "Diagnosing rare diseases remotely" or "Why most AI products solve fake problems"'
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-stone-400">Minimum 100 characters</p>
                  <p className="text-xs text-stone-500 tabular-nums">{interests.length} / 100</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Expertise */}
          {currentStep === 3 && (
            <div className="h-[400px] overflow-y-auto pr-2">
              <div>
                <label className="block text-xl font-bold text-stone-900 mb-4" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                  What are you really good at?
                </label>

                <textarea
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200/40 resize-none text-base text-stone-900 placeholder:text-stone-400 transition-all ${
                    showValidation && expertise.trim().length < 100
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                      : 'border-stone-300 focus:border-stone-900 hover:border-stone-400'
                  }`}
                  style={{ lineHeight: '1.6' }}
                  placeholder='Ex: "Scaling distributed systems - handled 1B+ requests/day with 99.99% uptime" or "Getting medical devices through FDA approval" or "Closing enterprise deals with Fortune 500 companies"'
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-stone-400">Minimum 100 characters</p>
                  <p className="text-xs text-stone-500 tabular-nums">{expertise.length} / 100</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: How You Can Help */}
          {currentStep === 4 && (
            <div className="h-[400px] overflow-y-auto pr-2">
              <div>
                <label className="block text-xl font-bold text-stone-900 mb-4" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>
                  How can you help others?
                </label>

                <div className="space-y-2">
                  {[
                    { value: 'advising', label: 'Advising or mentoring', Icon: Lightbulb },
                    { value: 'coffee_chats', label: 'Coffee chats about my domain', Icon: Coffee },
                    { value: 'feedback', label: 'Feedback or spot advice', Icon: MessageSquare },
                    { value: 'introductions', label: 'Making introductions', Icon: Users },
                    { value: 'not_available', label: 'Not available right now', Icon: Ban }
                  ].map(option => {
                    const isNotAvailable = option.value === 'not_available';
                    const notAvailableSelected = howIHelp.includes('not_available');
                    const otherOptionsSelected = howIHelp.some(h => h !== 'not_available');
                    
                    // Disable "not_available" if other options are selected
                    // Disable other options if "not_available" is selected
                    const isDisabled = isNotAvailable ? otherOptionsSelected : notAvailableSelected;
                    
                    return (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed border border-stone-300 bg-stone-50'
                            : howIHelp.includes(option.value)
                            ? 'bg-stone-100 border border-stone-900 cursor-pointer'
                            : 'border border-stone-300 hover:border-stone-400 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={howIHelp.includes(option.value)}
                          onChange={() => toggleHowIHelp(option.value)}
                          disabled={isDisabled}
                          className={`h-4 w-4 text-stone-900 rounded border-stone-300 flex-shrink-0 ${
                            isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        />
                        <option.Icon className={`w-4 h-4 ${isDisabled ? 'text-stone-400' : 'text-stone-600'}`} />
                        <span className={`text-sm ${isDisabled ? 'text-stone-400' : 'text-stone-900'}`}>
                          {option.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Add Photo & LinkedIn (Optional) */}
          {currentStep === 5 && (
            <div className="h-[400px] overflow-y-auto space-y-6 pr-2">
              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  Profile photo (optional)
                </label>
                {profilePicture ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden">
                      <img src={profilePicture} alt="Profile preview" className="w-full h-full object-cover" />
                    </div>
                    <label
                      htmlFor="profile-picture"
                      className="text-sm text-stone-600 hover:text-stone-900 cursor-pointer underline"
                    >
                      Change
                    </label>
                    <input
                      type="file"
                      id="profile-picture"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <label
                    htmlFor="profile-picture"
                    className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-300 rounded-lg cursor-pointer hover:border-stone-400 transition-colors"
                  >
                    <svg className="w-8 h-8 text-stone-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm text-stone-600">Drop photo here or click to upload</p>
                    <p className="text-xs text-stone-400 mt-1">JPG or PNG</p>
                    <input
                      type="file"
                      id="profile-picture"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm text-stone-600 mb-2">
                  LinkedIn (optional)
                </label>
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200/40 text-base text-stone-900 placeholder:text-stone-400 transition-all border-stone-300 focus:border-stone-900 hover:border-stone-400"
                  placeholder="https://linkedin.com/in/yourname"
                />
              </div>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-stone-200">
            {currentStep === 1 && (
              <>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className={`py-2.5 px-8 rounded-lg font-semibold text-sm transition-all ${
                    isStepValid()
                      ? 'bg-stone-900 text-white hover:bg-stone-800'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              </>
            )}

            {currentStep > 1 && currentStep < totalSteps && (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className={`py-2.5 px-8 rounded-lg font-semibold text-sm transition-all ${
                    isStepValid()
                      ? 'bg-stone-900 text-white hover:bg-stone-800'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              </>
            )}

            {currentStep === totalSteps && (
              <>
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!isStepValid() || isSubmitting}
                  className={`py-2.5 px-8 rounded-lg font-semibold text-sm transition-all ${
                    isStepValid() && !isSubmitting
                      ? 'bg-stone-900 text-white hover:bg-stone-800'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Complete Profile'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
