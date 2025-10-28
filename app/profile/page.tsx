'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import UserProfileDropdown from '../components/UserProfileDropdown';
import { Coffee, Flame, Handshake } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type CommitmentItem = {
  commitment: 'high' | 'medium' | 'low';
  type: string;
};

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
  const [notLookingFor, setNotLookingFor] = useState('');
  const [lookingFor, setLookingFor] = useState<CommitmentItem[]>([]);
  const [openTo, setOpenTo] = useState<CommitmentItem[]>([]);
  const [optedIn, setOptedIn] = useState(false);

  // Expandable sections state
  const [expandedLookingFor, setExpandedLookingFor] = useState<{[key: string]: boolean}>({
    high: false, medium: false, low: false
  });
  const [expandedOpenTo, setExpandedOpenTo] = useState<{[key: string]: boolean}>({
    high: false, medium: false, low: false
  });

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
          setExpertise(profileData.expertise === 'Profile incomplete' ? '' : (profileData.expertise || ''));
          setNotLookingFor(profileData.not_looking_for || '');
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

  const handleEditMode = () => {
    // Clear "Profile incomplete" placeholders when entering edit mode
    if (background === 'Profile incomplete') {
      setBackground('');
    }
    if (expertise === 'Profile incomplete') {
      setExpertise('');
    }
    setIsEditing(true);
  };

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
        linkedin_url: linkedinUrl || null,
        profile_picture: profilePicture || null,
        not_looking_for: notLookingFor || null,
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
            setExpertise(profileData.expertise === 'Profile incomplete' ? '' : (profileData.expertise || ''));
            setNotLookingFor(profileData.not_looking_for || '');
            setLookingFor(profileData.looking_for || []);
            setOpenTo(profileData.open_to || []);
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
    background.length >= 150 &&
    expertise.length >= 150 &&
    lookingFor.length > 0 &&
    openTo.length > 0;

  // Display format helper
  const formatCommitmentItem = (item: CommitmentItem) => {
    const labels: {[key: string]: string} = {
      // High commitment - looking for
      'technical_cofounder': 'Technical cofounder',
      'business_cofounder': 'Business cofounder',
      'domain_expert_cofounder': 'Domain expert cofounder',
      'founding_team_member': 'Founding team member',
      'cocreator_founding_team': 'Co-creator / founding team member', // legacy
      'long_term_collaborator': 'Long-term project collaborator', // legacy
      'team_member': 'Team member (employee/contractor)', // legacy
      // Medium commitment - looking for
      'advisor': 'Advisor or mentor',
      'project_collaborator': 'Project collaborator',
      'service_provider': 'Receiving paid services',
      'beta_tester': 'Beta tester',
      // Low commitment - looking for
      'introduction': 'Introductions',
      'coffee_chats': 'Coffee chats / networking',
      'feedback': 'Feedback on idea/product',
      'quick_consultation': 'Quick consultation (30 min)', // legacy
      // High commitment - open to
      'being_technical_cofounder': 'Being a technical cofounder',
      'being_business_cofounder': 'Being a business cofounder',
      'being_domain_expert_cofounder': 'Being a domain expert cofounder',
      'joining_founding_team': 'Joining as founding team member',
      'being_cocreator_founding_team': 'Joining as co-creator / founding team', // legacy
      'long_term_collaboration': 'Long-term collaboration', // legacy
      'joining_team': 'Joining a team', // legacy
      // Medium commitment - open to
      'mentoring': 'Advising / mentoring',
      'project_collaboration': 'Collaborating on projects', // legacy
      'providing_services': 'Providing paid services',
      'being_beta_tester': 'Being a beta tester',
      // Low commitment - open to
      'making_introductions': 'Making introductions',
      'coffee_chats': 'Coffee chats / networking',
      'giving_feedback': 'Giving feedback on ideas/products',
      'offering_consultation': 'Offering quick consultations (30 min)', // legacy
      'other': 'Other'
    };
    
    return labels[item.type] || item.type;
  };

  const getCommitmentIcon = (commitment: string) => {
    return commitment === 'high' ? Flame : commitment === 'medium' ? Handshake : Coffee;
  };

  const getCommitmentLabel = (commitment: string) => {
    return commitment === 'high' ? 'High Commitment' : commitment === 'medium' ? 'Medium Commitment' : 'Low Commitment';
  };

  // Group items by commitment level for display
  const groupByCommitment = (items: CommitmentItem[]) => {
    const grouped: {[key: string]: CommitmentItem[]} = {
      high: [],
      medium: [],
      low: []
    };
    items.forEach(item => {
      grouped[item.commitment].push(item);
    });
    return grouped;
  };

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
    { type: 'business_cofounder', label: 'Business cofounder' },
    { type: 'domain_expert_cofounder', label: 'Domain expert cofounder' },
    { type: 'founding_team_member', label: 'Founding team member' },
    { type: 'other', label: 'Other' }
  ];

  const lookingForMediumOptions = [
    { type: 'advisor', label: 'Advisor or mentor' },
    { type: 'service_provider', label: 'Receiving paid services' },
    { type: 'beta_tester', label: 'Beta tester' },
    { type: 'other', label: 'Other' }
  ];

  const lookingForLowOptions = [
    { type: 'introduction', label: 'Introductions' },
    { type: 'coffee_chats', label: 'Coffee chats / networking' },
    { type: 'feedback', label: 'Feedback on idea/product' },
    { type: 'other', label: 'Other' }
  ];

  const openToHighOptions = [
    { type: 'being_technical_cofounder', label: 'Being a technical cofounder' },
    { type: 'being_business_cofounder', label: 'Being a business cofounder' },
    { type: 'being_domain_expert_cofounder', label: 'Being a domain expert cofounder' },
    { type: 'joining_founding_team', label: 'Joining as founding team member' },
    { type: 'other', label: 'Other' }
  ];

  const openToMediumOptions = [
    { type: 'mentoring', label: 'Advising / mentoring' },
    { type: 'providing_services', label: 'Providing paid services' },
    { type: 'being_beta_tester', label: 'Being a beta tester' },
    { type: 'other', label: 'Other' }
  ];

  const openToLowOptions = [
    { type: 'making_introductions', label: 'Making introductions' },
    { type: 'coffee_chats', label: 'Coffee chats / networking' },
    { type: 'giving_feedback', label: 'Giving feedback on ideas/products' },
    { type: 'other', label: 'Other' }
  ];

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
                onClick={handleEditMode}
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
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-0 text-sm text-stone-900 placeholder:text-stone-400 transition-colors"
                  placeholder="https://linkedin.com/in/yourname"
                />
              )}
            </div>

            {/* Background */}
            <div>
              <label className="block text-sm mb-2 font-medium text-stone-700">
                What have you built or worked on?
              </label>
              {!isEditing ? (
                <p className={`text-sm whitespace-pre-wrap ${background && background !== 'Profile incomplete' ? 'text-stone-700' : 'text-stone-400'}`}>
                  {background && background !== 'Profile incomplete' ? background : 'Not provided'}
                </p>
              ) : (
                <>
                  <textarea
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[90px] transition-colors ${
                      showValidation && background.length < 150
                        ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                        : 'border-stone-200 focus:border-teal-600'
                    }`}
                    style={{ lineHeight: '1.6' }}
                    placeholder="e.g., Product manager at HubSpot for 4 years, shipped features used by 10k+ customers, worked across design and engineering teams..."
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
                How can you help others? What do you bring to the table?
              </label>
              {!isEditing ? (
                <p className={`text-sm whitespace-pre-wrap ${expertise && expertise !== 'Profile incomplete' ? 'text-stone-700' : 'text-stone-400'}`}>
                  {expertise && expertise !== 'Profile incomplete' ? expertise : 'Not provided'}
                </p>
              ) : (
                <>
                  <textarea
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    rows={3}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 min-h-[90px] transition-colors ${
                      showValidation && expertise.length < 150
                        ? 'border-red-300 bg-red-50/30 focus:border-red-500'
                        : 'border-stone-200 focus:border-teal-600'
                    }`}
                    style={{ lineHeight: '1.6' }}
                    placeholder="e.g., Financial modeling, fundraising strategy, investor pitch development. Know several angel investors in the Maine ecosystem who invest in early-stage climate tech."
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
                  <div className="space-y-4">
                    {lookingFor.length > 0 ? (
                      Object.entries(groupByCommitment(lookingFor)).map(([commitment, items]) => (
                        items.length > 0 && (
                          <div key={commitment}>
                            <div className="flex items-center gap-2 mb-2">
                              {(() => {
                                const Icon = getCommitmentIcon(commitment);
                                return <Icon className="w-4 h-4 text-red-600" />;
                              })()}
                              <span className="text-xs font-semibold text-stone-600">{getCommitmentLabel(commitment)}</span>
                            </div>
                            <div className="space-y-1.5 ml-6">
                              {items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-stone-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                                  {formatCommitmentItem(item)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))
                    ) : (
                      <p className="text-sm text-stone-400">Not specified</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <CommitmentSection
                      title="High Commitment"
                      subtitle="Long-term partnership, significant time investment"
                      commitment="high"
                      Icon={Flame}
                      bgColor="bg-red-50/30"
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
                      bgColor="bg-amber-50/30"
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
                      bgColor="bg-teal-50/30"
                      options={lookingForLowOptions}
                      selectedItems={lookingFor}
                      onToggle={toggleLookingFor}
                      expanded={expandedLookingFor.low}
                      onToggleExpand={() => setExpandedLookingFor(prev => ({ ...prev, low: !prev.low }))}
                    />
                  </div>
                )}
              </div>

              {/* Open To */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 mb-3" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                  I'm open to
                </h3>
                {!isEditing ? (
                  <div className="space-y-4">
                    {openTo.length > 0 ? (
                      Object.entries(groupByCommitment(openTo)).map(([commitment, items]) => (
                        items.length > 0 && (
                          <div key={commitment}>
                            <div className="flex items-center gap-2 mb-2">
                              {(() => {
                                const Icon = getCommitmentIcon(commitment);
                                return <Icon className="w-4 h-4 text-red-600" />;
                              })()}
                              <span className="text-xs font-semibold text-stone-600">{getCommitmentLabel(commitment)}</span>
                            </div>
                            <div className="space-y-1.5 ml-6">
                              {items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-stone-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                                  {formatCommitmentItem(item)}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))
                    ) : (
                      <p className="text-sm text-stone-400">Not specified</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <CommitmentSection
                      title="High Commitment"
                      subtitle="Long-term partnership, significant time investment"
                      commitment="high"
                      Icon={Flame}
                      bgColor="bg-red-50/30"
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
                      bgColor="bg-amber-50/30"
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
                      bgColor="bg-teal-50/30"
                      options={openToLowOptions}
                      selectedItems={openTo}
                      onToggle={toggleOpenTo}
                      expanded={expandedOpenTo.low}
                      onToggleExpand={() => setExpandedOpenTo(prev => ({ ...prev, low: !prev.low }))}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Not Looking For */}
            <div className="pt-4">
              <label className="block text-sm mb-2 font-medium text-stone-700">
                What are you NOT looking for? <span className="text-stone-400">(optional)</span>
              </label>
              {!isEditing ? (
                <p className={`text-sm whitespace-pre-wrap ${notLookingFor ? 'text-stone-700' : 'text-stone-400'}`}>
                  {notLookingFor || 'Not specified'}
                </p>
              ) : (
                <textarea
                  value={notLookingFor}
                  onChange={(e) => setNotLookingFor(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-0 resize-none text-sm text-stone-900 placeholder:text-stone-400 transition-colors"
                  style={{ lineHeight: '1.6' }}
                  placeholder="e.g., Not interested in sales roles, avoid cryptocurrency projects"
                />
              )}
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
