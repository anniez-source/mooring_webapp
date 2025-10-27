/**
 * Clerk-authenticated Supabase client for frontend use
 * This client passes the Clerk session token to Supabase for RLS
 */

import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Hook to get a Supabase client authenticated with Clerk session
 * Use this in React components that need to query Supabase with RLS
 */
export function useSupabaseClient() {
  const { getToken } = useAuth();

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: async () => {
        const token = await getToken({ template: 'supabase' });
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    },
  });

  return supabase;
}

/**
 * Create a Supabase client with a specific Clerk token
 * Use this in contexts where you already have the token
 */
export function createSupabaseClient(token: string | null) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

/**
 * Basic Supabase client without authentication
 * Only use for public data or when auth is handled elsewhere
 */
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

