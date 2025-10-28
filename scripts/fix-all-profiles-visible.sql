-- Make all profiles visible by setting opted_in = true
-- Run this in Supabase SQL Editor

UPDATE profiles
SET opted_in = true
WHERE opted_in = false OR opted_in IS NULL;

-- Verify the update
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN opted_in = true THEN 1 END) as now_visible
FROM profiles;

