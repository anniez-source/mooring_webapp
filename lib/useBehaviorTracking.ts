'use client';

/**
 * Simplified behavior tracking hook
 * No chat_sessions needed - tracks searches, saves, and views directly
 */

import { useState } from 'react';

export function useBehaviorTracking() {
  const [isTracking, setIsTracking] = useState(false);

  const trackSearch = async (userId: string, searchQuery: string) => {
    if (!userId || !searchQuery) return;
    
    try {
      await fetch('/api/behavior/track-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, searchQuery })
      });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  };

  const trackSave = async (userId: string, savedProfileId: string) => {
    if (!userId || !savedProfileId) return;
    
    setIsTracking(true);
    try {
      await fetch('/api/behavior/track-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, savedProfileId })
      });
      console.log('✅ Behavior learning: contact saved');
    } catch (error) {
      console.error('Error tracking save:', error);
    } finally {
      setIsTracking(false);
    }
  };

  const trackProfileView = async (userId: string, viewedProfileId: string) => {
    if (!userId || !viewedProfileId) return;
    
    try {
      await fetch('/api/behavior/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, viewedProfileId })
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  return {
    trackSearch,
    trackSave,
    trackProfileView,
    isTracking
  };
}





