# Two-Table Schema Migration - Complete ✅

## Overview
Successfully updated the entire codebase to work with your two-table schema:
- **`users`** table - Stores Clerk authentication data
- **`profiles`** table - Stores detailed profile information

## What Was Done

### 1. ✅ Updated OnboardingModal (`app/components/OnboardingModal.tsx`)

**Profile Check:**
```typescript
// Step 1: Get user_id from users table using clerk_user_id
const { data: userData } = await supabase
  .from('users')
  .select('id')
  .eq('clerk_user_id', user.id)
  .single();

// Step 2: Check profile using user_id
const { data: profileData } = await supabase
  .from('profiles')
  .select('background, expertise, looking_for, open_to, opted_in')
  .eq('user_id', userData.id)
  .single();
```

**Profile Save:**
```typescript
// Uses UPSERT to insert or update profile
await supabase
  .from('profiles')
  .upsert(profileData, { onConflict: 'user_id' });
```

### 2. ✅ Updated Onboard Page (`app/onboard/page.tsx`)
- Same pattern as modal: lookup user first, then upsert profile
- Works as standalone page if users navigate to `/onboard` directly

### 3. ✅ Updated Chat Page (`app/chat/page.tsx`)

**User Sync on Login:**
```typescript
// Creates user in users table if doesn't exist
// OnboardingModal handles profile creation/completion
const { data: newUser } = await supabase
  .from('users')
  .insert({
    clerk_user_id: user.id,
    email: user.emailAddresses[0]?.emailAddress,
    name: user.fullName || user.firstName
  });
```

### 4. ✅ Schema Files Created

**`complete_schema_setup.sql`** - Complete SQL setup including:
- Users table creation
- Profiles table creation  
- Indexes for performance
- Auto-update triggers for `updated_at`
- Test data examples
- Verification queries

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Profiles Table
```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  profile_picture TEXT,
  linkedin_url TEXT,
  background TEXT NOT NULL,
  expertise TEXT NOT NULL,
  looking_for JSONB NOT NULL DEFAULT '[]'::jsonb,
  open_to JSONB NOT NULL DEFAULT '[]'::jsonb,
  opted_in BOOLEAN DEFAULT FALSE,
  imported_from TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## How It Works Now

### User Flow:

1. **User logs in with Clerk**
   - `chat/page.tsx` syncs user to `users` table

2. **OnboardingModal checks profile**
   - Queries `users` table to get `user_id`
   - Queries `profiles` table to check completion
   - Shows modal if incomplete

3. **User fills out onboarding**
   - Gets `user_id` from `users` table
   - UPSERTs data to `profiles` table
   - Sets `opted_in = true`

4. **Modal closes & never shows again**
   - Profile marked as complete
   - User can access platform

### Data Flow:
```
Clerk → users (clerk_user_id) → profiles (user_id FK)
```

## What's Next?

### Run the Complete Setup SQL

Execute `complete_schema_setup.sql` in Supabase SQL Editor if you haven't already. This will create the `updated_at` triggers we use in the code.

### Test the Flow

1. **Log in as a new user**
   - Modal should appear automatically

2. **Fill out the form**
   - Enter background (150+ chars)
   - Enter expertise (150+ chars)
   - Check at least 1 option in each section
   - Accept consent

3. **Submit**
   - Modal closes
   - Profile saved to database

4. **Verify in Supabase:**
```sql
SELECT 
  u.clerk_user_id,
  u.name,
  u.email,
  p.opted_in,
  p.background,
  p.expertise,
  p.looking_for,
  p.open_to
FROM users u
INNER JOIN profiles p ON p.user_id = u.id
WHERE u.clerk_user_id = 'your-clerk-id';
```

### Expected Result:
```json
{
  "clerk_user_id": "user_abc123",
  "name": "John Doe",
  "email": "john@example.com",
  "opted_in": true,
  "background": "Product manager at...",
  "expertise": "Product strategy, user research...",
  "looking_for": ["A cofounder", "Mentorship"],
  "open_to": ["Providing domain expertise", "Making introductions"]
}
```

## Benefits of Two-Table Design

✅ **Normalized Data** - User auth separate from profile data  
✅ **Better Security** - Can apply different RLS policies  
✅ **Cleaner Imports** - Can import users without profiles  
✅ **Scalability** - Easy to add more related tables  
✅ **Referential Integrity** - CASCADE delete maintains consistency

## Migration Checklist

- [x] Update OnboardingModal component
- [x] Update onboard page
- [x] Update chat page user sync
- [x] Create complete SQL schema
- [x] Add updated_at triggers
- [ ] Run `complete_schema_setup.sql` in Supabase (if not done)
- [ ] Test new user onboarding flow
- [ ] Verify data in both tables
- [ ] Test existing features work

## Troubleshooting

### Modal doesn't appear?
Check if user exists in `users` table:
```sql
SELECT * FROM users WHERE clerk_user_id = 'your-clerk-id';
```

### Profile not saving?
Check for errors in browser console. Common issues:
- User doesn't exist in `users` table first
- Missing required fields
- Foreign key constraint failure

### Need to reset profile?
```sql
DELETE FROM profiles WHERE user_id IN (
  SELECT id FROM users WHERE clerk_user_id = 'your-clerk-id'
);
```

## Files Modified

1. ✅ `app/components/OnboardingModal.tsx` - Two-step lookup/save
2. ✅ `app/onboard/page.tsx` - Two-step lookup/save
3. ✅ `app/chat/page.tsx` - Users table sync
4. ✅ `complete_schema_setup.sql` - Complete SQL setup

## Next Features (Optional)

- Add RLS policies for data security
- Add profile edit functionality
- Add user preferences table
- Add activity logging
- Add profile versioning/history

---

🎉 **Everything is ready!** Your dev server should auto-reload. Test by logging in as a new user!

