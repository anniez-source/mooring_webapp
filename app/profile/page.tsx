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
  const [expertise, setExpertise] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [openTo, setOpenTo] = useState<string[]>([]);
  const [optedIn, setOptedIn] = useState(false);

  const lookingForOptions = [
    'A cofounder',
    'Domain expertise',
    'Introductions',
    'Mentorship'
  ];

  const openToOptions = [
    'Being a cofounder for the right fit',
    'Providing domain expertise',
    'Making introductions',
    'Mentoring'
  ];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isLoaded || !user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get user_id from users table
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

        // Get profile data
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

        // Set profile data
        if (profileData) {
          setProfilePicture(profileData.profile_picture);
          setLinkedinUrl(profileData.linkedin_url || '');
          setBackground(profileData.background || '');
          setExpertise(profileData.expertise || '');
          setLookingFor(profileData.looking_for || []);
          setOpenTo(profileData.open_to || []);
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

  const toggleLookingFor = (option: string) => {
    setLookingFor(prev =>
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const toggleOpenTo = (option: string) => {
    setOpenTo(prev =>
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

  const validate = () => {
    const newErrors: string[] = [];
    if (background.length < 150) {
      newErrors.push('Background must be at least 150 characters');
    }
    if (expertise.length < 150) {
      newErrors.push('Expertise must be at least 150 characters');
    }
    if (lookingFor.length === 0) {
      newErrors.push('Please select at least one option in "I\'m looking for"');
    }
    if (openTo.length === 0) {
      newErrors.push('Please select at least one option in "I\'m open to"');
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
      // Get user_id
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
        expertise,
        looking_for: lookingFor,
        open_to: openTo,
        opted_in: optedIn,
        updated_at: new Date().toISOString()
      };

      if (linkedinUrl) {
        profileData.linkedin_url = linkedinUrl;
      }
      if (profilePicture) {
        profileData.profile_picture = profilePicture;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      setIsEditing(false);
      setShowValidation(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setErrors([error.message || 'Failed to save profile. Please try again.']);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowValidation(false);
    setErrors([]);
    // Refresh to reset data
    router.refresh();
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
    background.length >= 150 &&
    expertise.length >= 150 &&
    lookingFor.length > 0 &&
    openTo.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      {/* Navbar */}
      <nav className="bg-white/60 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center gap-2">
              <img src="/mooring-logo.svg" alt="Mooring" className="w-6 h-6" />
              <span className="text-2xl font-bold text-stone-900 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/chat" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">Find People</Link>
              <Link href="/saved" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">Saved</Link>
              <Link href="/profile" className="text-sm text-stone-900 font-medium">Profile</Link>
              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Content */}
      <div className="max-w-[900px] mx-auto px-8 py-12">
        <div className="bg-white rounded-xl border border-stone-200 p-10" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-stone-900 mb-2 tracking-tight" style={{ fontFamily: 'var(--font-ibm-plex)', fontWeight: 600 }}>
                Your Profile
              </h1>
              <p className="text-sm text-stone-600">
                {isEditing ? 'Update your profile information' : 'Manage your profile and visibility settings'}
              </p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>

          <div className="space-y-8">
            {/* Profile Picture */}
            <div>
              <label className="block text-xs mb-2 text-stone-500 font-medium">
                Profile Photo
              </label>
              {!isEditing ? (
                profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-stone-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-sm">
                    No photo
                  </div>
                )
              ) : (
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
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-0 text-sm text-stone-900 placeholder:text-stone-400 transition-colors"
                  placeholder="https://linkedin.com/in/yourname"
                />
              )}
            </div>

            {/* Background */}
            <div>
              <label className="block text-sm mb-2 font-medium text-stone-700">
                Background
              </label>
              {!isEditing ? (
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{background || 'Not provided'}</p>
              ) : (
                <>
                  <textarea
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    rows={5}
                    className={`w-full px-4 py-3.5 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[140px] transition-colors ${
                      showValidation && background.length < 150
                        ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                        : 'border-stone-200 focus:border-teal-600'
                    }`}
                    style={{ lineHeight: '1.6' }}
                    placeholder="What's your background? What have you built or worked on?"
                  />
                  <p className={`mt-2 text-xs ${background.length >= 150 ? 'text-teal-600' : showValidation && background.length < 150 ? 'text-red-600' : 'text-stone-400'}`}>
                    {background.length}/150 minimum
                  </p>
                </>
              )}
            </div>

            {/* Expertise */}
            <div>
              <label className="block text-sm mb-2 font-medium text-stone-700">
                Expertise
              </label>
              {!isEditing ? (
                <p className="text-sm text-stone-700 whitespace-pre-wrap">{expertise || 'Not provided'}</p>
              ) : (
                <>
                  <textarea
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    rows={5}
                    className={`w-full px-4 py-3.5 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[140px] transition-colors ${
                      showValidation && expertise.length < 150
                        ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                        : 'border-stone-200 focus:border-teal-600'
                    }`}
                    style={{ lineHeight: '1.6' }}
                    placeholder="What expertise do you have to offer?"
                  />
                  <p className={`mt-2 text-xs ${expertise.length >= 150 ? 'text-teal-600' : showValidation && expertise.length < 150 ? 'text-red-600' : 'text-stone-400'}`}>
                    {expertise.length}/150 minimum
                  </p>
                </>
              )}
            </div>

            {/* Looking For & Open To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Looking For */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 mb-3" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                  I'm looking for
                </h3>
                {!isEditing ? (
                  <div className="space-y-2">
                    {lookingFor.length > 0 ? (
                      lookingFor.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-stone-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                          {item}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-stone-400">Not specified</p>
                    )}
                  </div>
                ) : (
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
                            ? 'bg-white border-2 border-red-200 hover:border-red-300'
                            : 'bg-white border-2 border-stone-200 hover:border-teal-400 hover:bg-teal-50/30'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={lookingFor.includes(option)}
                          onChange={() => toggleLookingFor(option)}
                          className="h-5 w-5 text-teal-600 focus:ring-2 focus:ring-teal-500 rounded border-stone-300 cursor-pointer"
                        />
                        <span className={`text-sm font-medium ${
                          lookingFor.includes(option) ? 'text-teal-900' : 'text-stone-700'
                        }`}>
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Open To */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 mb-3" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                  I'm open to
                </h3>
                {!isEditing ? (
                  <div className="space-y-2">
                    {openTo.length > 0 ? (
                      openTo.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-stone-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                          {item}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-stone-400">Not specified</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {openToOptions.map((option) => (
                      <label
                        key={option}
                        className={`
                          group relative flex items-center gap-3.5 px-4 py-4 
                          rounded-lg cursor-pointer transition-all duration-200
                          ${openTo.includes(option)
                            ? 'bg-teal-50 border-2 border-teal-500 shadow-sm'
                            : showValidation && openTo.length === 0
                            ? 'bg-white border-2 border-red-200 hover:border-red-300'
                            : 'bg-white border-2 border-stone-200 hover:border-teal-400 hover:bg-teal-50/30'
                          }
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={openTo.includes(option)}
                          onChange={() => toggleOpenTo(option)}
                          className="h-5 w-5 text-teal-600 focus:ring-2 focus:ring-teal-500 rounded border-stone-300 cursor-pointer"
                        />
                        <span className={`text-sm font-medium ${
                          openTo.includes(option) ? 'text-teal-900' : 'text-stone-700'
                        }`}>
                          {option}
                        </span>
                      </label>
                    ))}
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
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 border-2 border-stone-200 text-stone-600 rounded-lg text-sm font-medium hover:border-stone-300 hover:bg-stone-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isFormValid || isSaving}
                  style={{
                    backgroundColor: isFormValid && !isSaving ? '#0D9488' : '#E7E5E4',
                    color: isFormValid && !isSaving ? 'white' : '#A8A29E'
                  }}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium text-sm transition-all ${
                    isFormValid && !isSaving
                      ? 'hover:opacity-90 shadow-sm cursor-pointer'
                      : 'cursor-not-allowed'
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
