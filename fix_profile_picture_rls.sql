-- Fix RLS policies to allow profile picture updates
-- Run this in Supabase SQL Editor

-- Drop existing UPDATE policy for profiles if it exists
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create new UPDATE policy that allows users to update their own profile (all columns)
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'UPDATE';

