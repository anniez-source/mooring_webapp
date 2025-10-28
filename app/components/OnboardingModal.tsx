'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Coffee, Flame, Handshake } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CommitmentItem = {
  commitment: 'high' | 'medium' | 'low';
  type: string;
};

export default function OnboardingModal() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [currentWork, setCurrentWork] = useState('');
  const [expertiseOffering, setExpertiseOffering] = useState('');
  const [notLookingFor, setNotLookingFor] = useState('');
  const [lookingFor, setLookingFor] = useState<CommitmentItem[]>([]);
  const [openTo, setOpenTo] = useState<CommitmentItem[]>([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  // Expandable sections state
  const [expandedLookingFor, setExpandedLookingFor] = useState<{[key: string]: boolean}>({
    high: false, medium: false, low: false
  });
  const [expandedOpenTo, setExpandedOpenTo] = useState<{[key: string]: boolean}>({
    high: false, medium: false, low: false
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
          .select('background, expertise, looking_for, open_to, opted_in')
          .eq('user_id', userData.user_id)
          .single();

        if (profileError) {
          setShowModal(true);
          setIsChecking(false);
          return;
        }

        const hasIncompleteProfile = 
          !profileData?.background || 
          !profileData?.expertise ||
          profileData?.background === 'Profile incomplete' ||
          profileData?.expertise === 'Profile incomplete' ||
          profileData?.background.length < 150 ||
          profileData?.expertise.length < 150;
        
        setShowModal(hasIncompleteProfile);
        setIsChecking(false);
      } catch (error) {
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

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;

      setShowModal(false);
      router.refresh();
    } catch (error: any) {
      setErrors([error.message || 'Failed to save profile. Please try again.']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    currentWork.length >= 150 &&
    expertiseOffering.length >= 150 &&
    lookingFor.length > 0 &&
    openTo.length > 0 &&
    consent;

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
        expertise: 'Profile incomplete',
        looking_for: [],
        open_to: [],
        opted_in: false
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

  const CommitmentSection = ({
    title,
    subtitle,
    commitment,
    Icon,
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
    Icon: React.ComponentType<{ className?: string }>;
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
          <Icon className="w-5 h-5 text-red-600" />
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
    { type: 'coffee_chats', label: 'Coffee chats / networking' },
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
    { type: 'other', label: 'Other' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[900px] max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-10 py-6 rounded-t-2xl z-10">
          <h1 className="text-2xl font-semibold text-stone-900 tracking-tight" style={{ fontFamily: 'var(--font-ibm-plex)', fontWeight: 600 }}>
            Complete Your Profile
          </h1>
          <p className="text-sm text-stone-600 mt-2">
            Help us understand who you are and what you're looking for
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          {/* Optional Profile Fields */}
          <div className="space-y-6 pb-8 border-b border-stone-200">
            <div>
              <label className="block text-xs mb-2 text-stone-500">
                Profile photo <span className="text-stone-400">(optional)</span>
              </label>
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
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-stone-800" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
              About You
            </h2>
            
            <div>
              <label className="block text-sm mb-2" style={{ color: '#4B5563' }}>
                What have you built or worked on?
              </label>
              <textarea
                value={currentWork}
                onChange={(e) => setCurrentWork(e.target.value)}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[90px] transition-colors ${
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

            <div>
              <label className="block text-sm mb-2" style={{ color: '#4B5563' }}>
                How can you help others? What do you bring to the table?
              </label>
              <textarea
                value={expertiseOffering}
                onChange={(e) => setExpertiseOffering(e.target.value)}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[90px] transition-colors ${
                  showValidation && expertiseOffering.length < 150
                    ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                    : 'border-stone-200 focus:border-teal-600'
                }`}
                style={{ boxShadow: 'none', lineHeight: '1.6' }}
                placeholder="e.g., Financial modeling, fundraising strategy, investor pitch development. Know several angel investors in the Maine ecosystem who invest in early-stage climate tech."
              />
              <p className={`mt-2 ${expertiseOffering.length >= 150 ? 'text-teal-600' : showValidation && expertiseOffering.length < 150 ? 'text-red-600' : 'text-stone-400'}`} style={{ fontSize: '11px' }}>
                {expertiseOffering.length}/150 minimum
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
                  Icon={Flame}
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
                  Icon={Handshake}
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
                  Icon={Coffee}
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
                  Icon={Flame}
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
                  Icon={Handshake}
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
                  Icon={Coffee}
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

          {/* Not Looking For */}
          <div>
            <label className="block text-sm mb-2 font-medium text-stone-700">
              What are you NOT looking for? <span className="text-stone-400">(optional)</span>
            </label>
            <textarea
              value={notLookingFor}
              onChange={(e) => setNotLookingFor(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 transition-colors"
              style={{ boxShadow: 'none', lineHeight: '1.6' }}
              placeholder="e.g., Not interested in sales roles, avoid cryptocurrency projects"
            />
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
