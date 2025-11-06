'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import UserProfileDropdown from '../components/UserProfileDropdown';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  
  // Profile data
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [background, setBackground] = useState('');
  const [interests, setInterests] = useState('');
  const [expertise, setExpertise] = useState('');
  const [howIHelp, setHowIHelp] = useState<string[]>([]);
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isLoaded || !user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('clerk_user_id', user.id)
          .single();

        if (userError || !userData) {
          console.error('User not found:', userError);
          setIsLoading(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userData.user_id)
          .single();

        if (profileError) {
          console.error('Profile not found:', profileError);
          setIsLoading(false);
          return;
        }

        if (profileData) {
          console.log('Loading profile picture:', profileData.profile_picture ? 'YES' : 'NO', profileData.profile_picture?.substring(0, 50));
          setProfilePicture(profileData.profile_picture || null);
          setLinkedinUrl(profileData.linkedin_url || '');
          // Filter out "Profile incomplete" placeholders
          setBackground(profileData.background === 'Profile incomplete' ? '' : (profileData.background || ''));
          setInterests(profileData.interests === 'Profile incomplete' ? '' : (profileData.interests || ''));
          setExpertise(profileData.expertise === 'Profile incomplete' ? '' : (profileData.expertise || ''));
          setHowIHelp(profileData.how_i_help || []);
          setOptedIn(profileData.opted_in || false);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, isLoaded]);

  const handleEditMode = () => {
    setIsEditing(true);
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

  const handleProfilePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        setErrors(['Please upload a JPG or PNG image']);
        return;
      }
      
      // Check file size (limit to 500KB to avoid database issues)
      const maxSize = 500 * 1024; // 500KB
      if (file.size > maxSize) {
        setErrors([`Image too large (${Math.round(file.size / 1024)}KB). Please use an image under 500KB.`]);
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        console.log('Image loaded, size:', Math.round(base64String.length / 1024), 'KB');
        setProfilePicture(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors: string[] = [];
    if (!background || background.trim().length < 50) {
      newErrors.push('Please share your story (at least 50 characters)');
    }
    if (!interests || interests.trim().length < 30) {
      newErrors.push('Please share what problems you\'re obsessed with (at least 30 characters)');
    }
    if (!expertise || expertise.trim().length < 30) {
      newErrors.push('Please share your expertise (at least 30 characters)');
    }
    
    if (linkedinUrl && !linkedinUrl.match(/^https?:\/\/(www\.)?linkedin\.com\/.+/i)) {
      newErrors.push('Please enter a valid LinkedIn URL');
    }
    return newErrors;
  };


  const handleSave = async () => {
    setErrors([]);
    setShowValidation(true);

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!user) return;
    setIsSaving(true);

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, name, email')
        .eq('clerk_user_id', user.id)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      const profileData: any = {
        user_id: userData.user_id,
        name: userData.name,
        email: userData.email,
        background,
        interests,
        expertise,
        how_i_help: howIHelp,
        opted_in: optedIn,
        linkedin_url: linkedinUrl || null,
        profile_picture: profilePicture || null,
        updated_at: new Date().toISOString()
      };

      console.log('Saving profile with picture:', profilePicture ? 'YES' : 'NO', profilePicture?.substring(0, 50));

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Profile saved successfully');

      // Generate embedding for the updated profile
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

      setIsEditing(false);
      setShowValidation(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setErrors([error.message || 'Failed to save profile. Please try again.']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    setIsEditing(false);
    setShowValidation(false);
    setErrors([]);
    
    // Refetch profile data to restore original values
    if (user) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('user_id')
          .eq('clerk_user_id', user.id)
          .single();

        if (userData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userData.user_id)
            .single();

          if (profileData) {
            console.log('Refetching profile picture:', profileData.profile_picture ? 'YES' : 'NO');
            setProfilePicture(profileData.profile_picture || null);
            setLinkedinUrl(profileData.linkedin_url || '');
            setBackground(profileData.background === 'Profile incomplete' ? '' : (profileData.background || ''));
            setInterests(profileData.interests === 'Profile incomplete' ? '' : (profileData.interests || ''));
            setExpertise(profileData.expertise === 'Profile incomplete' ? '' : (profileData.expertise || ''));
            setHowIHelp(profileData.how_i_help || []);
            setOptedIn(profileData.opted_in || false);
          }
        }
      } catch (error) {
        console.error('Error refetching profile:', error);
      }
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-stone-500">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  const isFormValid =
    background.trim().length >= 50 &&
    interests.trim().length >= 30 &&
    expertise.trim().length >= 30;

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
              <Link href="/communities" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">Communities</Link>
              <Link href="/my-cluster" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">My Cluster</Link>
              <Link href="/chat" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">Find People</Link>
              <Link href="/saved" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">Saved</Link>
              <Link href="/profile" className="text-sm text-stone-900 font-medium">Profile</Link>
              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="bg-white border border-stone-200/50">
          {/* Header */}
          <div className="flex justify-between items-start px-8 py-6 border-b border-stone-200/50">
            <div>
              <h1 className="text-xl font-semibold text-stone-900 mb-1 tracking-tight" style={{ fontFamily: 'var(--font-ibm-plex)', fontWeight: 600 }}>
                Your Profile
              </h1>
              <p className="text-xs text-stone-500">
                {isEditing ? 'Update your profile information' : 'Manage your profile and visibility settings'}
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={handleEditMode}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="px-8 py-6 space-y-6">
            {/* Profile Picture */}
            <div>
              <label className="block text-xs mb-2 text-stone-500 font-medium">
                Profile Photo
              </label>
              {!isEditing ? (
                profilePicture ? (
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-stone-200">
                    <img src={profilePicture} alt="Profile" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-sm">
                    No photo
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3">
                  {profilePicture && (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-stone-200">
                      <img src={profilePicture} alt="Profile preview" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
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
                </div>
              )}
            </div>

            {/* LinkedIn URL */}
            <div>
              <label className="block text-xs mb-2 text-stone-500 font-medium">
                LinkedIn Profile
              </label>
              {!isEditing ? (
                linkedinUrl ? (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 hover:text-teal-700">
                    {linkedinUrl}
                  </a>
                ) : (
                  <p className="text-sm text-stone-400">Not provided</p>
                )
              ) : (
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-200 focus:outline-none focus:border-teal-600 focus:ring-0 text-sm text-stone-900 placeholder:text-stone-400 transition-colors"
                  placeholder="https://linkedin.com/in/yourname"
                />
              )}
            </div>

            {/* Background Question 1 */}
            <div>
              <label className="block text-sm mb-2 font-medium text-stone-800">
                What's your story? Brag a little.
              </label>
              {!isEditing ? (
                <p className={`text-sm whitespace-pre-wrap ${background && background !== 'Profile incomplete' ? 'text-stone-700' : 'text-stone-400'}`}>
                  {background && background !== 'Profile incomplete' ? background : 'Not provided'}
                </p>
              ) : (
                <textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-3 border focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 transition-colors ${
                    showValidation && background.trim().length < 50
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                      : 'border-stone-200 focus:border-teal-600'
                  }`}
                  style={{ lineHeight: '1.6' }}
                  placeholder="8 years software engineering at Google and Stripe - built payments infrastructure handling $10B in transactions, led teams of 15 engineers"
                />
              )}
            </div>

            {/* Background Question 2 */}
            <div>
              <label className="block text-sm mb-2 font-medium text-stone-800">
                What problems are you obsessed with?
              </label>
              {!isEditing ? (
                <p className={`text-sm whitespace-pre-wrap ${interests && interests !== 'Profile incomplete' ? 'text-stone-700' : 'text-stone-400'}`}>
                  {interests && interests !== 'Profile incomplete' ? interests : 'Not provided'}
                </p>
              ) : (
                <textarea
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  rows={2}
                  className={`w-full px-4 py-3 border focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 transition-colors ${
                    showValidation && interests.trim().length < 30
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                      : 'border-stone-200 focus:border-teal-600'
                  }`}
                  style={{ lineHeight: '1.6' }}
                  placeholder="Making carbon markets actually work at scale"
                />
              )}
            </div>

            {/* Background Question 3 */}
            <div>
              <label className="block text-sm mb-2 font-medium text-stone-800">
                What do you know a lot about?
              </label>
              {!isEditing ? (
                <p className={`text-sm whitespace-pre-wrap ${expertise && expertise !== 'Profile incomplete' ? 'text-stone-700' : 'text-stone-400'}`}>
                  {expertise && expertise !== 'Profile incomplete' ? expertise : 'Not provided'}
                </p>
              ) : (
                <textarea
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  rows={2}
                  className={`w-full px-4 py-3 border focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 transition-colors ${
                    showValidation && expertise.trim().length < 30
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                      : 'border-stone-200 focus:border-teal-600'
                  }`}
                  style={{ lineHeight: '1.6' }}
                  placeholder="Distributed systems architecture - built services handling 1B+ requests per day with 99.99% uptime"
                />
              )}
            </div>

            {/* How Can You Help */}
            <div className="space-y-4 pt-4">
              <div>
                <label className="block text-sm mb-3 font-medium text-stone-800">
                  How can you help others? (check all that apply)
                </label>
                {!isEditing ? (
                  <div className="space-y-2">
                    {howIHelp.length > 0 ? (
                      howIHelp.map((help) => (
                        <div key={help} className="flex items-center gap-2 text-sm text-stone-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                          {help === 'advising' && 'Advising or mentoring'}
                          {help === 'coffee_chats' && 'Coffee chats about my domain'}
                          {help === 'feedback' && 'Feedback or spot advice'}
                          {help === 'introductions' && 'Making introductions'}
                          {help === 'not_available' && 'Not available right now'}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-stone-400">Not specified</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[
                      { value: 'advising', label: 'Advising or mentoring' },
                      { value: 'coffee_chats', label: 'Coffee chats about my domain' },
                      { value: 'feedback', label: 'Feedback or spot advice' },
                      { value: 'introductions', label: 'Making introductions' },
                      { value: 'not_available', label: 'Not available right now' }
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
                          className={`flex items-center gap-3 px-4 py-2.5 transition-all border ${
                            isDisabled 
                              ? 'bg-stone-50 border-stone-200 cursor-not-allowed opacity-50' 
                              : 'bg-white border-stone-200 hover:border-stone-300 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={howIHelp.includes(option.value)}
                            onChange={() => toggleHowIHelp(option.value)}
                            disabled={isDisabled}
                            className={`h-4 w-4 text-teal-600 focus:ring-1 focus:ring-teal-500 border-stone-300 ${
                              isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                          />
                          <span className={`text-sm ${isDisabled ? 'text-stone-400' : 'text-stone-700'}`}>
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Visibility Setting */}
            <div className="pt-4 border-t border-stone-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-stone-800 mb-1">
                    Profile Visibility
                  </h3>
                  <p className="text-xs text-stone-500">
                    {optedIn 
                      ? 'Your profile is visible in AI matching results' 
                      : 'Your profile is hidden from AI matching results'}
                  </p>
                </div>
                {isEditing && (
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={optedIn}
                      onChange={(e) => setOptedIn(e.target.checked)}
                      className="h-5 w-5 text-teal-600 focus:ring-2 focus:ring-teal-500 rounded border-stone-300"
                    />
                    <span className="ml-3 text-sm text-stone-700">Show in matching</span>
                  </label>
                )}
              </div>
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

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex gap-3 pt-6 border-t border-stone-200/50">
                <button
                  onClick={handleCancel}
                  className="px-6 py-2.5 border border-stone-200 text-stone-600 text-xs font-medium hover:border-stone-300 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isFormValid || isSaving}
                  className={`flex-1 py-2.5 px-6 font-medium text-xs transition-colors ${
                    isFormValid && !isSaving
                      ? 'bg-stone-900 text-white hover:bg-stone-800 cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
