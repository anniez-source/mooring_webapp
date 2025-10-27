'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OnboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
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
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        setErrors(['Please upload a JPG or PNG image']);
        return;
      }
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
    // Validate LinkedIn URL format if provided
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
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!user) return;

    setIsSubmitting(true);

    try {
      // First get the user_id from users table
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('clerk_user_id', user.id)
        .single();

      // If user doesn't exist, create them first
      if (userError || !userData) {
        console.log('User not found, creating user record...');
        
        const newUserData = {
          clerk_user_id: user.id,
          email: user.emailAddresses[0]?.emailAddress || '',
          name: user.fullName || user.firstName || 'User'
        };

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert(newUserData)
          .select('id, name, email')
          .single();

        if (createError) {
          console.error('Failed to create user:', createError);
          throw new Error('Failed to create user account. Please try again.');
        }

        console.log('User created successfully:', newUser);
        userData = newUser;
      }

      const profileData: any = {
        user_id: userData.id,
        name: userData.name,
        email: userData.email,
        background: currentWork,
        expertise: expertiseOffering,
        looking_for: lookingFor,
        open_to: canOffer,
        opted_in: consent,
        updated_at: new Date().toISOString()
      };

      // Add optional fields if provided
      if (linkedinUrl) {
        profileData.linkedin_url = linkedinUrl;
      }
      if (profilePicture) {
        profileData.profile_picture = profilePicture;
      }

      // Use upsert to insert or update
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      router.push('/chat');
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors(['Failed to save profile. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const isFormValid =
    currentWork.length >= 150 &&
    expertiseOffering.length >= 150 &&
    lookingFor.length > 0 &&
    canOffer.length > 0 &&
    consent;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      {/* Navbar */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-stone-900 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Form Content */}
      <div className="max-w-[900px] mx-auto px-8 py-12">
        <div className="bg-white rounded-xl border border-stone-200 p-10" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
          <div className="mb-12">
            <h1 className="text-2xl font-semibold text-stone-900 mb-2 tracking-tight" style={{ fontFamily: 'var(--font-ibm-plex)', fontWeight: 600 }}>
              Complete Your Profile
            </h1>
            <p className="text-sm text-stone-600">
              Help us understand who you are and what you're looking for
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
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

            {/* Checkbox Sections: Side-by-side on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Section 2: I'm looking for */}
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

              {/* Section 3: I'm open to */}
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
            <div style={{ marginTop: '2rem' }}>
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

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                style={{
                  backgroundColor: isFormValid && !isSubmitting ? '#0D9488' : '#E7E5E4',
                  color: isFormValid && !isSubmitting ? 'white' : '#A8A29E'
                }}
                className={`w-full py-3.5 px-6 rounded-lg font-medium text-sm transition-all ${
                  isFormValid && !isSubmitting
                    ? 'hover:opacity-90 shadow-sm cursor-pointer'
                    : 'cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Complete Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

