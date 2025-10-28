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
  detail?: string;
};

export default function OnboardPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [currentWork, setCurrentWork] = useState('');
  const [expertiseOffering, setExpertiseOffering] = useState('');
  const [lookingFor, setLookingFor] = useState<CommitmentItem[]>([]);
  const [openTo, setOpenTo] = useState<CommitmentItem[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  
  // Track "Other" text inputs
  const [lookingForOtherText, setLookingForOtherText] = useState<{[key: string]: string}>({
    high: '', medium: '', low: ''
  });
  const [openToOtherText, setOpenToOtherText] = useState<{[key: string]: string}>({
    high: '', medium: '', low: ''
  });

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

  const handleLookingForOther = (commitment: 'high' | 'medium' | 'low', text: string) => {
    setLookingForOtherText(prev => ({ ...prev, [commitment]: text }));
    
    setLookingFor(prev => {
      const exists = prev.find(item => item.commitment === commitment && item.type === 'other');
      const trimmedText = text.trim();
      
      if (!trimmedText) {
        // Remove if text is empty
        return prev.filter(item => !(item.commitment === commitment && item.type === 'other'));
      } else if (exists) {
        // Update existing
        return prev.map(item =>
          item.commitment === commitment && item.type === 'other'
            ? { ...item, detail: trimmedText }
            : item
        );
      } else {
        // Add new
        return [...prev, { commitment, type: 'other', detail: trimmedText }];
      }
    });
  };

  const handleOpenToOther = (commitment: 'high' | 'medium' | 'low', text: string) => {
    setOpenToOtherText(prev => ({ ...prev, [commitment]: text }));
    
    setOpenTo(prev => {
      const exists = prev.find(item => item.commitment === commitment && item.type === 'other');
      const trimmedText = text.trim();
      
      if (!trimmedText) {
        return prev.filter(item => !(item.commitment === commitment && item.type === 'other'));
      } else if (exists) {
        return prev.map(item =>
          item.commitment === commitment && item.type === 'other'
            ? { ...item, detail: trimmedText }
            : item
        );
      } else {
        return [...prev, { commitment, type: 'other', detail: trimmedText }];
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
    if (currentWork.length < 150) {
      newErrors.push('Please describe your background (minimum 150 characters)');
    }
    if (expertiseOffering.length < 150) {
      newErrors.push('Please describe your expertise (minimum 150 characters)');
    }
    if (lookingFor.length === 0) {
      newErrors.push('Please select at least one thing you\'re looking for');
    }
    if (openTo.length === 0) {
      newErrors.push('Please select at least one thing you\'re open to');
    }
    
    // Validate "Other" selections have detail text (min 10 chars)
    const lookingForOther = lookingFor.filter(item => item.type === 'other');
    for (const item of lookingForOther) {
      if (!item.detail || item.detail.length < 10) {
        newErrors.push('Please provide details for "Other" selections (minimum 10 characters)');
        break;
      }
    }
    
    const openToOther = openTo.filter(item => item.type === 'other');
    for (const item of openToOther) {
      if (!item.detail || item.detail.length < 10) {
        newErrors.push('Please provide details for "Other" selections (minimum 10 characters)');
        break;
      }
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
        background: currentWork,
        expertise: expertiseOffering,
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
    currentWork.length >= 150 &&
    expertiseOffering.length >= 150 &&
    lookingFor.length > 0 &&
    openTo.length > 0 &&
    consent &&
    lookingFor.filter(item => item.type === 'other').every(item => item.detail && item.detail.length >= 10) &&
    openTo.filter(item => item.type === 'other').every(item => item.detail && item.detail.length >= 10);

  const CommitmentSection = ({
    title,
    commitment,
    icon,
    bgColor,
    options,
    selectedItems,
    onToggle,
    otherText,
    onOtherChange,
    expanded,
    onToggleExpand
  }: {
    title: string;
    commitment: 'high' | 'medium' | 'low';
    icon: string;
    bgColor: string;
    options: { type: string; label: string }[];
    selectedItems: CommitmentItem[];
    onToggle: (commitment: 'high' | 'medium' | 'low', type: string) => void;
    otherText: string;
    onOtherChange: (commitment: 'high' | 'medium' | 'low', text: string) => void;
    expanded: boolean;
    onToggleExpand: () => void;
  }) => {
    const isOtherSelected = selectedItems.some(
      item => item.commitment === commitment && item.type === 'other'
    );

    return (
      <div className={`border-2 border-stone-200 rounded-lg overflow-hidden ${bgColor}`}>
        <button
          type="button"
          onClick={onToggleExpand}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="font-semibold text-stone-900 text-sm">{title}</span>
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
            
            {/* Other option with inline text input */}
            <div
              className={`px-3 py-2.5 rounded border transition-all ${
                isOtherSelected
                  ? 'bg-teal-50 border-teal-500'
                  : 'bg-white border-stone-200'
              }`}
            >
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOtherSelected}
                    onChange={() => {
                      if (isOtherSelected) {
                        onOtherChange(commitment, '');
                      }
                    }}
                    className="h-4 w-4 text-teal-600 focus:ring-2 focus:ring-teal-500 rounded border-stone-300 cursor-pointer"
                  />
                  <span className={`text-sm ${isOtherSelected ? 'text-teal-900 font-medium' : 'text-stone-700'}`}>
                    Other (please specify)
                  </span>
                </label>
                {isOtherSelected && (
                  <input
                    type="text"
                    value={otherText}
                    onChange={(e) => onOtherChange(commitment, e.target.value)}
                    placeholder="Describe what you're looking for..."
                    className="w-full px-3 py-2 border border-stone-300 rounded focus:outline-none focus:border-teal-600 text-sm"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Options for each commitment level
  const lookingForHighOptions = [
    { type: 'technical_cofounder', label: 'Technical cofounder' },
    { type: 'business_cofounder', label: 'Business/operations cofounder' },
    { type: 'long_term_collaborator', label: 'Long-term project collaborator' },
    { type: 'team_member', label: 'Team member (employee/contractor)' }
  ];

  const lookingForMediumOptions = [
    { type: 'advisor', label: 'Advisor or mentor' },
    { type: 'project_collaborator', label: 'Project collaborator (specific project)' },
    { type: 'service_provider', label: 'Service provider (ongoing)' },
    { type: 'beta_tester', label: 'Beta tester / design partner' }
  ];

  const lookingForLowOptions = [
    { type: 'customer_introduction', label: 'Customer/client introduction' },
    { type: 'investor_introduction', label: 'Investor introduction' },
    { type: 'expert_introduction', label: 'Expert introduction' },
    { type: 'quick_consultation', label: 'Quick consultation (30 min)' },
    { type: 'coffee_chat', label: 'Coffee chat / networking' },
    { type: 'event_coattendee', label: 'Event co-attendee' },
    { type: 'one_time_service', label: 'One-time service need' }
  ];

  const openToHighOptions = [
    { type: 'being_technical_cofounder', label: 'Being a technical cofounder' },
    { type: 'being_business_cofounder', label: 'Being a business cofounder' },
    { type: 'long_term_collaboration', label: 'Long-term collaboration' },
    { type: 'joining_team', label: 'Joining a team' }
  ];

  const openToMediumOptions = [
    { type: 'mentoring', label: 'Advising / mentoring' },
    { type: 'project_collaboration', label: 'Collaborating on projects' },
    { type: 'providing_services', label: 'Providing services (design, dev, consulting)' },
    { type: 'being_beta_tester', label: 'Being a beta tester' }
  ];

  const openToLowOptions = [
    { type: 'making_introductions', label: 'Making introductions' },
    { type: 'providing_consultation', label: 'Providing quick consultations (30 min)' },
    { type: 'coffee_chats', label: 'Coffee chats / networking' },
    { type: 'one_time_help', label: 'One-time help' }
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
              {/* Background */}
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

              {/* Expertise */}
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

            {/* Commitment Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* I'm looking for */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-800 mb-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                    I'm looking for
                  </h2>
                  <p className={`text-xs ${showValidation && lookingFor.length === 0 ? 'text-red-600 font-medium' : 'text-stone-500'}`}>
                    Select at least one across any commitment level
                  </p>
                </div>
                <div className="space-y-3">
                  <CommitmentSection
                    title="High Commitment"
                    commitment="high"
                    icon="🔥"
                    bgColor="bg-red-50/30"
                    options={lookingForHighOptions}
                    selectedItems={lookingFor}
                    onToggle={toggleLookingFor}
                    otherText={lookingForOtherText.high}
                    onOtherChange={handleLookingForOther}
                    expanded={expandedLookingFor.high}
                    onToggleExpand={() => setExpandedLookingFor(prev => ({ ...prev, high: !prev.high }))}
                  />
                  <CommitmentSection
                    title="Medium Commitment"
                    commitment="medium"
                    icon="🤝"
                    bgColor="bg-amber-50/30"
                    options={lookingForMediumOptions}
                    selectedItems={lookingFor}
                    onToggle={toggleLookingFor}
                    otherText={lookingForOtherText.medium}
                    onOtherChange={handleLookingForOther}
                    expanded={expandedLookingFor.medium}
                    onToggleExpand={() => setExpandedLookingFor(prev => ({ ...prev, medium: !prev.medium }))}
                  />
                  <CommitmentSection
                    title="Low Commitment"
                    commitment="low"
                    icon="☕"
                    bgColor="bg-teal-50/30"
                    options={lookingForLowOptions}
                    selectedItems={lookingFor}
                    onToggle={toggleLookingFor}
                    otherText={lookingForOtherText.low}
                    onOtherChange={handleLookingForOther}
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

              {/* I'm open to */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-stone-800 mb-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                    I'm open to
                  </h2>
                  <p className={`text-xs ${showValidation && openTo.length === 0 ? 'text-red-600 font-medium' : 'text-stone-500'}`}>
                    Select at least one across any commitment level
                  </p>
                </div>
                <div className="space-y-3">
                  <CommitmentSection
                    title="High Commitment"
                    commitment="high"
                    icon="🔥"
                    bgColor="bg-red-50/30"
                    options={openToHighOptions}
                    selectedItems={openTo}
                    onToggle={toggleOpenTo}
                    otherText={openToOtherText.high}
                    onOtherChange={handleOpenToOther}
                    expanded={expandedOpenTo.high}
                    onToggleExpand={() => setExpandedOpenTo(prev => ({ ...prev, high: !prev.high }))}
                  />
                  <CommitmentSection
                    title="Medium Commitment"
                    commitment="medium"
                    icon="🤝"
                    bgColor="bg-amber-50/30"
                    options={openToMediumOptions}
                    selectedItems={openTo}
                    onToggle={toggleOpenTo}
                    otherText={openToOtherText.medium}
                    onOtherChange={handleOpenToOther}
                    expanded={expandedOpenTo.medium}
                    onToggleExpand={() => setExpandedOpenTo(prev => ({ ...prev, medium: !prev.medium }))}
                  />
                  <CommitmentSection
                    title="Low Commitment"
                    commitment="low"
                    icon="☕"
                    bgColor="bg-teal-50/30"
                    options={openToLowOptions}
                    selectedItems={openTo}
                    onToggle={toggleOpenTo}
                    otherText={openToOtherText.low}
                    onOtherChange={handleOpenToOther}
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
