# Troubleshooting: Why Can't I See Other Profiles?

## The Issue

You have profiles in Supabase but can only see your own profile when searching. This happens because of two filtering mechanisms:

### 1. Organization Filtering
Users can only see profiles from people in **the same organization**. If users aren't assigned to an organization, they won't show up in searches.

### 2. Opt-In Status
Users must have `opted_in = true` to be visible in searches. This is set when users complete onboarding.

## Quick Diagnosis

Run this in **Supabase SQL Editor**:

```sql
-- See which profiles are visible
SELECT 
  p.name,
  p.email,
  p.opted_in,
  u.user_id,
  om.org_id
FROM profiles p
LEFT JOIN users u ON p.user_id = u.user_id
LEFT JOIN organization_members om ON u.user_id = om.user_id
ORDER BY p.name;
```

Look for:
- ❌ `opted_in = false` or `NULL` → User won't show up
- ❌ `org_id = NULL` → User has no organization

## Solution 1: Make All Profiles Visible

Run `scripts/fix-all-profiles-visible.sql`:

```sql
UPDATE profiles
SET opted_in = true
WHERE opted_in = false OR opted_in IS NULL;
```

## Solution 2: Assign Everyone to Same Organization

1. Run `scripts/assign-all-to-same-org.sql`
2. Follow the steps to:
   - Create a default organization
   - Assign all users to it

## Solution 3: Use Auto-Assignment (Recommended)

The file `auto_assign_new_users_to_test_org.sql` already exists in your repo. This automatically assigns new users to an organization when they sign up.

Make sure it's been run in Supabase!

## Quick Fix for Testing

If you just want to test with all profiles visible right now:

```sql
-- Make everyone visible
UPDATE profiles SET opted_in = true;

-- Get default org ID
SELECT id FROM organizations LIMIT 1;

-- Assign everyone to that org (replace the UUID)
INSERT INTO organization_members (org_id, user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000000',  -- Replace with actual org ID
  user_id,
  'member'
FROM users
ON CONFLICT DO NOTHING;
```

## Verify It Worked

```sql
-- Should show all profiles with org assignments
SELECT 
  p.name,
  p.email,
  p.opted_in,
  om.org_id,
  o.name as org_name
FROM profiles p
LEFT JOIN users u ON p.user_id = u.user_id
LEFT JOIN organization_members om ON u.user_id = om.user_id
LEFT JOIN organizations o ON om.org_id = o.id
WHERE p.opted_in = true
ORDER BY p.name;
```

## How It Works in the App

When you search in `/chat`, the app:

1. Gets your user ID from Clerk
2. Finds your organization(s)
3. Gets all users in those organization(s)
4. Returns only profiles where `opted_in = true`

Code location: `app/api/chat/route.ts` lines 211-246

## Prevention

To prevent this issue for new users:

1. ✅ Run `auto_assign_new_users_to_test_org.sql` (already in your repo)
2. ✅ Set default `opted_in = true` for new profiles (or remove the filter)
3. ✅ Auto-assign users to a default org on first login

Let me know if you need help with any of these steps!

