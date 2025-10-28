-- Run this in Supabase SQL Editor to diagnose profile visibility issues

-- 1. Check all profiles and their opted_in status
SELECT 
  id,
  name,
  email,
  opted_in,
  created_at
FROM profiles
ORDER BY created_at DESC;

-- 2. Check organization memberships
SELECT 
  om.user_id,
  u.name as user_name,
  om.org_id,
  o.name as org_name
FROM organization_members om
LEFT JOIN users u ON om.user_id = u.user_id
LEFT JOIN organizations o ON om.org_id = o.id
ORDER BY om.org_id, u.name;

-- 3. Check which profiles are visible (opted_in = true)
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN opted_in = true THEN 1 END) as opted_in_profiles,
  COUNT(CASE WHEN opted_in = false THEN 1 END) as opted_out_profiles
FROM profiles;

-- 4. Check profiles without organization assignments
SELECT 
  p.id,
  p.name,
  p.email,
  p.opted_in,
  u.user_id
FROM profiles p
LEFT JOIN users u ON p.user_id = u.user_id
LEFT JOIN organization_members om ON u.user_id = om.user_id
WHERE om.org_id IS NULL
ORDER BY p.name;

