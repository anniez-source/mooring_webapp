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
  const [currentWork, setCurrentWork] = useState('');
  const [expertiseOffering, setExpertiseOffering] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [canOffer, setCanOffer] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lookingForOptions = [
    'Cofounder',
    'Technical expertise',
    'Domain knowledge',
    'Mentorship/advice',
    'Connections/introductions',
    'Collaboration partner'
  ];

  const canOfferOptions = [
    'Can be a cofounder',
    'Technical expertise',
    'Domain knowledge',
    'Mentorship/advice',
    'Connections/introductions',
    'Collaboration opportunities'
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
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          background: currentWork,
          can_help_with: expertiseOffering,
          seeking_help_with: lookingFor,
          available_for: canOffer,
          completed_at: new Date().toISOString()
        })
        .eq('clerk_user_id', user.id);

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
    canOffer.length > 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta)' }}>Mooring</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Form Content */}
      <div className="max-w-2xl mx-auto px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
            Complete Your Profile
          </h1>
          <p className="text-lg text-gray-600">
            Help us understand who you are and what you're looking for
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Section 1: About Your Work */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
              About You
            </h2>

            {/* What are you working on */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                What's your background? What have you built or worked on?
              </label>
              <textarea
                value={currentWork}
                onChange={(e) => setCurrentWork(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent resize-none text-base"
                placeholder="e.g., 10+ years in Customer Success at Boston B2B SaaS companies, built enterprise rollout frameworks, led teams managing $25M+ ARR, worked at ReversingLabs and Veracode..."
              />
              <p className={`mt-2 text-sm ${currentWork.length >= 150 ? 'text-green-600' : 'text-red-500'}`}>
                {currentWork.length}/150 minimum
              </p>
            </div>

            {/* What expertise do you have */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                What experience and expertise do you have to offer others?
              </label>
              <textarea
                value={expertiseOffering}
                onChange={(e) => setExpertiseOffering(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent resize-none text-base"
                placeholder="e.g., Go-to-market strategy, team leadership, enterprise customer implementations, systems thinking, organizational design, SaaS economics..."
              />
              <p className={`mt-2 text-sm ${expertiseOffering.length >= 150 ? 'text-green-600' : 'text-red-500'}`}>
                {expertiseOffering.length}/150 minimum
              </p>
            </div>
          </div>

          {/* Section 2: What You're Looking For */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
              What You're Looking For
            </h2>
            <p className="text-sm text-gray-600 mb-4">Select at least one option</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lookingForOptions.map((option) => (
                <label
                  key={option}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    lookingFor.includes(option)
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={lookingFor.includes(option)}
                    onChange={() => toggleLookingFor(option)}
                    className="mr-3 h-5 w-5 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: What You Can Offer */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
              What You Can Offer
            </h2>
            <p className="text-sm text-gray-600 mb-4">Select at least one option</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {canOfferOptions.map((option) => (
                <label
                  key={option}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    canOffer.includes(option)
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={canOffer.includes(option)}
                    onChange={() => toggleCanOffer(option)}
                    className="mr-3 h-5 w-5 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-900">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-600">{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-base transition-colors ${
                isFormValid && !isSubmitting
                  ? 'bg-teal-600 text-white hover:bg-teal-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Complete Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

