# 🔐 Clerk + Supabase JWT Integration Setup

## Overview

This guide sets up secure integration between Clerk (authentication) and Supabase (database) so that Row Level Security (RLS) works properly.

**Without this setup:** RLS policies can't identify the current user, causing permission errors.  
**With this setup:** Clerk session tokens are passed to Supabase, enabling proper RLS filtering.

---

## 📋 Prerequisites

- ✅ Clerk account with application set up
- ✅ Supabase project created
- ✅ Both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local`
- ✅ Supabase URL and anon key in `.env.local`

---

## 🚀 Step-by-Step Setup

### Step 1: Get Your Supabase JWT Secret

1. Go to **Supabase Dashboard** → Your Project
2. Click **Settings** (gear icon) → **API**
3. Scroll down to **JWT Settings**
4. Copy the **JWT Secret** (starts with a long random string)

**Save this for Step 2!**

---

### Step 2: Create Clerk JWT Template for Supabase

1. Go to **Clerk Dashboard** → Your Application
2. Navigate to **JWT Templates** (in sidebar under "Configure")
3. Click **+ New template**
4. Click **Supabase** (pre-configured template)

**Configure the template:**

| Field | Value |
|-------|-------|
| **Name** | `supabase` (exactly this - used in code) |
| **Token Lifetime** | `60` seconds (default is fine) |
| **Signing Algorithm** | `HS256` |
| **Signing Key** | Paste the JWT Secret from Supabase (Step 1) |

**Claims Configuration:**

The Supabase template should auto-populate with these claims:
```json
{
  "aud": "authenticated",
  "exp": {{exp}},
  "iat": {{iat}},
  "iss": "{{iss}}",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "role": "authenticated",
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "user_metadata": {}
}
```

**Key fields:**
- `sub`: Clerk user ID (this is what RLS policies use)
- `aud`: Must be `"authenticated"`
- `role`: Must be `"authenticated"`

5. Click **Save** (or **Apply Changes**)

---

### Step 3: Run the Clerk-Compatible RLS SQL

In **Supabase SQL Editor**, run this file:

```bash
enable_rls_with_clerk.sql
```

This creates:
- ✅ Helper function `current_clerk_user_id()` to extract Clerk user ID from JWT
- ✅ RLS policies for all tables using Clerk authentication
- ✅ Organization-based filtering
- ✅ Opted-in/opted-out profile filtering

---

### Step 4: Verify the Integration

#### Test 1: Check JWT Template

In Clerk Dashboard → JWT Templates → `supabase`:
- Click **Generate a preview token**
- You should see a JWT with `"sub": "user_..."` (your Clerk user ID)

#### Test 2: Test in Your App

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Log in to your app**

3. **Open browser console**

4. **Check OnboardingModal logs:**
   ```
   [OnboardingModal] Checking profile for user: user_xxx
   [OnboardingModal] Profile data: {...}
   ```

   **No errors!** ✅

5. **Try clicking "Skip for now":**
   ```
   [OnboardingModal] User skipped onboarding
   [OnboardingModal] Minimal profile created, user can explore platform
   ```

   **Modal should close and not reappear** ✅

#### Test 3: Verify RLS is Working

In browser console:
```javascript
// This should work now (with proper filtering)
const { data, error } = await supabase.from('profiles').select('*');
console.log('Profiles:', data);
console.log('Error:', error); // Should be null

// Should only see opted-in profiles from your org
```

---

## 🔍 Troubleshooting

### Error: "JWT expired" or "Invalid JWT"

**Cause:** Clerk JWT template not configured or wrong signing key

**Fix:**
1. Double-check JWT Secret from Supabase matches Clerk template
2. Verify template name is exactly `supabase` (lowercase)
3. Make sure token lifetime isn't 0

---

### Error: "new row violates row-level security policy"

**Cause:** RLS policy is blocking the operation

**Fix:**
1. Check that `current_clerk_user_id()` function exists:
   ```sql
   SELECT current_clerk_user_id();
   -- Should return your Clerk user ID when logged in
   ```

2. Verify RLS policies exist:
   ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```

3. Test with RLS temporarily disabled:
   ```sql
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   -- Try your operation
   -- Then re-enable:
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ```

---

### OnboardingModal still showing after "Skip for now"

**Cause:** Profile not being created due to RLS block

**Check browser console for:**
```
[OnboardingModal] Error creating user for skip: {...}
```

**Fix:**
1. Verify Clerk JWT template is created and active
2. Check that `useSupabaseClient()` hook is being used (not old hardcoded client)
3. Verify `.env.local` has correct Supabase credentials

---

### "Cannot read properties of null" errors

**Cause:** `getToken({ template: 'supabase' })` returning null

**Fix:**
1. Ensure user is logged in
2. Verify JWT template name is exactly `supabase`
3. Check Clerk secret key is correct in `.env.local`

---

## 🎯 What This Setup Enables

### ✅ Secure RLS with Clerk Auth
- Users can only access their own data
- Organization-based filtering works
- Opted-out users are hidden from matching

### ✅ Frontend Queries Work
- `useSupabaseClient()` hook automatically includes Clerk token
- All Supabase queries respect RLS
- No need to manually pass user IDs

### ✅ Onboarding Flow Works
- "Skip for now" creates profile successfully
- Modal doesn't reappear after dismissal
- Profile page shows user's data

### ✅ Multi-Tenancy
- Users see only profiles from their organization(s)
- Chat messages are private
- Saved contacts are private

---

## 📝 Code Changes Summary

### New Files Created

1. **`lib/supabase-client.ts`**
   - `useSupabaseClient()` hook - use in React components
   - Automatically includes Clerk session token
   - Replaces old hardcoded `supabase` client

2. **`enable_rls_with_clerk.sql`**
   - Clerk-compatible RLS policies
   - `current_clerk_user_id()` helper function
   - Replaces `enable_row_level_security.sql`

### Updated Files

1. **`app/components/OnboardingModal.tsx`**
   - Now uses `useSupabaseClient()` hook
   - Imports `useAuth` from Clerk
   - Works with RLS enabled

---

## 🔒 Security Checklist

After setup, verify:

- [ ] Clerk JWT template created with name `supabase`
- [ ] Supabase JWT secret matches Clerk signing key
- [ ] `enable_rls_with_clerk.sql` has been run
- [ ] RLS is enabled on all tables (verify with SQL)
- [ ] OnboardingModal works without errors
- [ ] "Skip for now" creates profile and closes modal
- [ ] Browser console queries are filtered by RLS
- [ ] Users can't see other orgs' data

---

## 🚀 Ready for Production

Once all checks pass:

1. **Test with multiple users in different orgs**
2. **Verify RLS isolation** (users can't access other orgs)
3. **Enable Supabase rate limiting** (in dashboard)
4. **Monitor Supabase logs** for auth errors
5. **Set up Clerk production environment**

---

## 📚 Additional Resources

- [Clerk JWT Templates Docs](https://clerk.com/docs/backend-requests/making/jwt-templates)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase + Clerk Integration](https://supabase.com/docs/guides/auth/social-login/clerk)

---

## ✅ Summary

**Before this setup:**
- ❌ RLS policies couldn't identify users
- ❌ Frontend queries failed with permission errors
- ❌ Onboarding modal stuck in error loop

**After this setup:**
- ✅ Clerk JWTs work with Supabase RLS
- ✅ Frontend queries properly filtered
- ✅ Secure, organization-based multi-tenancy
- ✅ Production-ready authentication

**You're all set!** 🎉

