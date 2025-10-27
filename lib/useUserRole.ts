/**
 * Custom hook to get user role from Clerk
 */

import { useUser } from '@clerk/nextjs';

export type UserRole = 'admin' | 'member' | null;

export function useUserRole(): UserRole {
  const { user } = useUser();
  
  if (!user) return null;
  
  // Get role from public metadata
  const role = user.publicMetadata?.role as UserRole;
  
  return role || 'member'; // Default to member if no role set
}

export function useIsAdmin(): boolean {
  const role = useUserRole();
  return role === 'admin';
}

