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

type CommitmentItem = {
  commitment: 'high' | 'medium' | 'low';
  type: string;
};

export default function OnboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [background, setBackground] = useState('');
  const [interests, setInterests] = useState('');
  const [expertise, setExpertise] = useState('');
  const [lookingFor, setLookingFor] = useState<CommitmentItem[]>([]);
  const [openTo, setOpenTo] = useState<CommitmentItem[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Expandable sections state
  const [expandedLookingFor, setExpandedLookingFor] = useState<{[key: string]: boolean}>({
    high: true, medium: true, low: true
  });
  const [expandedOpenTo, setExpandedOpenTo] = useState<{[key: string]: boolean}>({
    high: true, medium: true, low: true
  });

  const toggleLookingFor = (commitment: 'high' | 'medium' | 'low', type: string) => {
    setLookingFor(prev => {
      const exists = prev.find(item => item.commitment === commitment && item.type === type);
      if (exists) {
        return prev.filter(item => !(item.commitment === commitment && item.type === type));
      } else {
        return [...prev, { commitment, type }];
      }
    });
  };

  const toggleOpenTo = (commitment: 'high' | 'medium' | 'low', type: string) => {
    setOpenTo(prev => {
      const exists = prev.find(item => item.commitment === commitment && item.type === type);
      if (exists) {
        return prev.filter(item => !(item.commitment === commitment && item.type === type));
      } else {
        return [...prev, { commitment, type }];
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
      newErrors.push('Please describe your story (minimum 150 characters)');
    }
    if (interests.length < 100) {
      newErrors.push('Please describe the problems you&apos;re obsessed with (minimum 100 characters)');
    }
    if (expertise.length < 150) {
      newErrors.push('Please describe what you know a lot about (minimum 150 characters)');
    }
    if (lookingFor.length === 0) {
      newErrors.push('Please select at least one thing you&apos;re looking for');
    }
    if (openTo.length === 0) {
      newErrors.push('Please select at least one thing you&apos;re open to');
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

        if (createError) {
          throw new Error('Failed to create user account. Please try again.');
        }
        userData = newUser;
      }

      const profileData: any = {
        user_id: userData.user_id,
        name: userData.name,
        email: userData.email,
        background: background,
        interests: interests,
        expertise: expertise,
        looking_for: lookingFor,
        open_to: openTo,
        opted_in: consent,
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
    background.length >= 150 &&
    interests.length >= 100 &&
    expertise.length >= 150 &&
    lookingFor.length > 0 &&
    openTo.length > 0 &&
    consent;

  const CommitmentSection = ({
    title,
    subtitle,
    commitment,
    icon,
    bgColor,
    options,
    selectedItems,
    onToggle,
    expanded,
    onToggleExpand
  }: {
    title: string;
    subtitle: string;
    commitment: 'high' | 'medium' | 'low';
    icon: string;
    bgColor: string;
    options: { type: string; label: string }[];
    selectedItems: CommitmentItem[];
    onToggle: (commitment: 'high' | 'medium' | 'low', type: string) => void;
    expanded: boolean;
    onToggleExpand: () => void;
  }) => (
    <div className={`border-2 border-stone-200 rounded-lg overflow-hidden ${bgColor}`}>
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div className="text-left">
            <div className="font-semibold text-stone-900 text-sm">{title}</div>
            <div className="text-xs text-stone-500">{subtitle}</div>
          </div>
        </div>
        <span className="text-stone-500 text-sm">{expanded ? '▼' : '▶'}</span>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {options.map(option => {
            const isChecked = selectedItems.some(
              item => item.commitment === commitment && item.type === option.type
            );
            return (
              <label
                key={option.type}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-teal-50 border border-teal-500'
                    : 'bg-white border border-stone-200 hover:border-teal-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(commitment, option.type)}
                  className="h-4 w-4 text-teal-600 focus:ring-2 focus:ring-teal-500 rounded border-stone-300 cursor-pointer"
                />
                <span className={`text-sm ${isChecked ? 'text-teal-900 font-medium' : 'text-stone-700'}`}>
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );

  // Options for each commitment level
  const lookingForHighOptions = [
    { type: 'technical_cofounder', label: 'Technical cofounder' },
    { type: 'business_cofounder', label: 'Business/operations cofounder' },
    { type: 'long_term_collaborator', label: 'Long-term project collaborator' },
    { type: 'team_member', label: 'Team member (employee/contractor)' },
    { type: 'other', label: 'Other' }
  ];

  const lookingForMediumOptions = [
    { type: 'advisor', label: 'Advisor or mentor' },
    { type: 'project_collaborator', label: 'Project collaborator (specific project)' },
    { type: 'service_provider', label: 'Service provider (ongoing)' },
    { type: 'beta_tester', label: 'Beta tester / design partner' },
    { type: 'other', label: 'Other' }
  ];

  const lookingForLowOptions = [
    { type: 'introduction', label: 'Introduction to someone specific' },
    { type: 'quick_consultation', label: 'Quick consultation (30 min)' },
    { type: 'coffee_chat', label: 'Coffee chat / networking' },
    { type: 'other', label: 'Other' }
  ];

  const openToHighOptions = [
    { type: 'being_technical_cofounder', label: 'Being a technical cofounder' },
    { type: 'being_business_cofounder', label: 'Being a business cofounder' },
    { type: 'long_term_collaboration', label: 'Long-term collaboration' },
    { type: 'joining_team', label: 'Joining a team' },
    { type: 'other', label: 'Other' }
  ];

  const openToMediumOptions = [
    { type: 'mentoring', label: 'Advising / mentoring' },
    { type: 'project_collaboration', label: 'Collaborating on projects' },
    { type: 'providing_services', label: 'Providing services' },
    { type: 'being_beta_tester', label: 'Being a beta tester' },
    { type: 'other', label: 'Other' }
  ];

  const openToLowOptions = [
    { type: 'making_introductions', label: 'Making introductions' },
    { type: 'offering_consultation', label: 'Offering quick consultations (30 min)' },
    { type: 'coffee_chats', label: 'Coffee chats / networking' },
    { type: 'beta_testing', label: 'Beta testing new products/features' },
    { type: 'other', label: 'Other' }
  ];

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
                </div>
              </div>

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
              
              <div>
                <label className="block text-sm mb-2" style={{ color: '#4B5563' }}>
                  What&apos;s your story? Brag a little.
                </label>
                <textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  rows={5}
                  className={`w-full px-4 py-3.5 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[140px] transition-colors ${
                    showValidation && background.length < 150
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                      : 'border-stone-200 focus:border-teal-600'
                  }`}
                  style={{ boxShadow: 'none', lineHeight: '1.6' }}
                  placeholder="e.g., Led Customer Success teams at enterprise SaaS companies, managing $25M+ ARR and Fortune 500 implementations..."
                />
                <p className={`mt-2 ${background.length >= 150 ? 'text-teal-600' : showValidation && background.length < 150 ? 'text-red-600' : 'text-stone-400'}`} style={{ fontSize: '11px' }}>
                  {background.length}/150 minimum
                </p>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#4B5563' }}>
                  What problems are you obsessed with?
                </label>
                <textarea
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-3.5 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[120px] transition-colors ${
                    showValidation && interests.length < 100
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                      : 'border-stone-200 focus:border-teal-600'
                  }`}
                  style={{ boxShadow: 'none', lineHeight: '1.6' }}
                  placeholder="e.g., Why organizations spend billions on software that creates expensive human middleware roles instead of solving problems directly..."
                />
                <p className={`mt-2 ${interests.length >= 100 ? 'text-teal-600' : showValidation && interests.length < 100 ? 'text-red-600' : 'text-stone-400'}`} style={{ fontSize: '11px' }}>
                  {interests.length}/100 minimum
                </p>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: '#4B5563' }}>
                  What do you know a lot about?
                </label>
                <textarea
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  rows={5}
                  className={`w-full px-4 py-3.5 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[140px] transition-colors ${
                    showValidation && expertise.length < 150
                      ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                      : 'border-stone-200 focus:border-teal-600'
                  }`}
                  style={{ boxShadow: 'none', lineHeight: '1.6' }}
                  placeholder="e.g., Enterprise GTM strategy, customer success operations, stakeholder management, systems thinking, organizational design..."
                />
                <p className={`mt-2 ${expertise.length >= 150 ? 'text-teal-600' : showValidation && expertise.length < 150 ? 'text-red-600' : 'text-stone-400'}`} style={{ fontSize: '11px' }}>
                  {expertise.length}/150 minimum
                </p>
              </div>
            </div>

            {/* Commitment Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* I&apos;m looking for */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-800 mb-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                    I&apos;m looking for
                  </h2>
                  <p className={`text-xs ${showValidation && lookingFor.length === 0 ? 'text-red-600 font-medium' : 'text-stone-500'}`}>
                    Select at least one across any commitment level
                  </p>
                </div>
                <div className="space-y-3">
                  <CommitmentSection
                    title="High Commitment"
                    subtitle="Long-term partnership, significant time investment"
                    commitment="high"
                    icon="🔥"
                    bgColor="bg-red-50/20"
                    options={lookingForHighOptions}
                    selectedItems={lookingFor}
                    onToggle={toggleLookingFor}
                    expanded={expandedLookingFor.high}
                    onToggleExpand={() => setExpandedLookingFor(prev => ({ ...prev, high: !prev.high }))}
                  />
                  <CommitmentSection
                    title="Medium Commitment"
                    subtitle="Ongoing relationship, regular interaction"
                    commitment="medium"
                    icon="🤝"
                    bgColor="bg-amber-50/20"
                    options={lookingForMediumOptions}
                    selectedItems={lookingFor}
                    onToggle={toggleLookingFor}
                    expanded={expandedLookingFor.medium}
                    onToggleExpand={() => setExpandedLookingFor(prev => ({ ...prev, medium: !prev.medium }))}
                  />
                  <CommitmentSection
                    title="Low Commitment"
                    subtitle="One-time help, quick interaction"
                    commitment="low"
                    icon="☕"
                    bgColor="bg-teal-50/20"
                    options={lookingForLowOptions}
                    selectedItems={lookingFor}
                    onToggle={toggleLookingFor}
                    expanded={expandedLookingFor.low}
                    onToggleExpand={() => setExpandedLookingFor(prev => ({ ...prev, low: !prev.low }))}
                  />
                </div>
                {showValidation && lookingFor.length === 0 && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1.5">
                    <span>⚠</span>
                    <span>Please select at least one option</span>
                  </p>
                )}
              </div>

              {/* I&apos;m open to */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-800 mb-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                    I&apos;m open to
                  </h2>
                  <p className={`text-xs ${showValidation && openTo.length === 0 ? 'text-red-600 font-medium' : 'text-stone-500'}`}>
                    Select at least one across any commitment level
                  </p>
                </div>
                <div className="space-y-3">
                  <CommitmentSection
                    title="High Commitment"
                    subtitle="Long-term partnership, significant time investment"
                    commitment="high"
                    icon="🔥"
                    bgColor="bg-red-50/20"
                    options={openToHighOptions}
                    selectedItems={openTo}
                    onToggle={toggleOpenTo}
                    expanded={expandedOpenTo.high}
                    onToggleExpand={() => setExpandedOpenTo(prev => ({ ...prev, high: !prev.high }))}
                  />
                  <CommitmentSection
                    title="Medium Commitment"
                    subtitle="Ongoing relationship, regular interaction"
                    commitment="medium"
                    icon="🤝"
                    bgColor="bg-amber-50/20"
                    options={openToMediumOptions}
                    selectedItems={openTo}
                    onToggle={toggleOpenTo}
                    expanded={expandedOpenTo.medium}
                    onToggleExpand={() => setExpandedOpenTo(prev => ({ ...prev, medium: !prev.medium }))}
                  />
                  <CommitmentSection
                    title="Low Commitment"
                    subtitle="One-time help, quick interaction"
                    commitment="low"
                    icon="☕"
                    bgColor="bg-teal-50/20"
                    options={openToLowOptions}
                    selectedItems={openTo}
                    onToggle={toggleOpenTo}
                    expanded={expandedOpenTo.low}
                    onToggleExpand={() => setExpandedOpenTo(prev => ({ ...prev, low: !prev.low }))}
                  />
                </div>
                {showValidation && openTo.length === 0 && (
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
