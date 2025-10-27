// Temporary test component to verify Clerk JWT
// Add this to any page to test

'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';

export default function TestClerkJWT() {
  const { getToken } = useAuth();

  useEffect(() => {
    const testToken = async () => {
      try {
        const token = await getToken({ template: 'supabase' });
        console.log('🔑 Clerk JWT Token:', token);
        
        if (!token) {
          console.error('❌ No token returned! Check Clerk JWT template setup.');
        } else {
          console.log('✅ Token received! Length:', token.length);
          
          // Decode the JWT to see what's in it
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            console.log('📋 JWT Payload:', payload);
            console.log('👤 User ID (sub):', payload.sub);
          }
        }
      } catch (error) {
        console.error('❌ Error getting token:', error);
      }
    };

    testToken();
  }, [getToken]);

  return null;
}


