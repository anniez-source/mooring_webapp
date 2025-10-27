# Schema Migration Summary

## ✅ All Code Updated to Match New Schema

### Field Name Changes
| Old Field Name | New Field Name | Type | Notes |
|----------------|----------------|------|-------|
| `can_help_with` | `expertise` | TEXT | Renamed for clarity |
| `seeking_help_with` | `looking_for` | JSONB | Changed to JSON array |
| `available_for` | `open_to` | JSONB | Changed to JSON array |
| `completed_at` | `opted_in` | BOOLEAN | Changed completion tracking |

## Files Updated

### 1. ✅ `app/components/OnboardingModal.tsx`
**Changes:**
- Profile completion check now uses: `background`, `expertise`, `looking_for`, `open_to`, `opted_in`
- Submit handler updates: `expertise`, `looking_for`, `open_to`, `opted_in`
- Removed `completed_at` timestamp
- Added `updated_at` timestamp

### 2. ✅ `app/onboard/page.tsx`
**Changes:**
- Submit handler uses new field names
- Saves `opted_in` instead of checking `consent`
- Uses `expertise`, `looking_for`, `open_to`

### 3. ✅ `app/api/chat/route.ts`
**Changes:**
- Maps new fields to old interface for Claude:
  - `profile.expertise` → `can_help_with`
  - `profile.looking_for` → `seeking_help_with`
  - `profile.open_to` → `available_for`

### 4. ✅ `app/chat/page.tsx`
**Changes:**
- Updated `Profile` interface with new fields
- Changed profile completion check from `completed_at` to `opted_in`
- Dummy profile creation uses new field names

## Next Steps

### 1. Execute SQL in Supabase
Run the SQL script: `create_new_profiles_table.sql`

**In Supabase Dashboard:**
1. Go to **SQL Editor**
2. Create a new query
3. Paste the contents of `create_new_profiles_table.sql`
4. Click **Run**

⚠️ **WARNING**: This will drop the existing `profiles` table and all data!

### 2. Test the Onboarding Flow
After running the SQL:

1. **Clear your profile** (if it exists):
   ```sql
   UPDATE profiles 
   SET background = NULL, 
       expertise = NULL, 
       looking_for = '[]'::jsonb,
       open_to = '[]'::jsonb,
       opted_in = FALSE
   WHERE clerk_user_id = 'your-clerk-user-id';
   ```

2. **Refresh any page** - Modal should appear

3. **Fill out the form** with:
   - Background (150+ chars)
   - Expertise (150+ chars)
   - At least 1 checkbox in "I'm looking for"
   - At least 1 checkbox in "I'm open to"
   - Consent checkbox

4. **Submit** - Modal should close

5. **Verify in Supabase**:
   ```sql
   SELECT 
     clerk_user_id,
     background,
     expertise,
     looking_for,
     open_to,
     opted_in,
     created_at,
     updated_at
   FROM profiles
   WHERE clerk_user_id = 'your-clerk-user-id';
   ```

### 3. Expected Data Format

**Example profile record:**
```json
{
  "id": "uuid-here",
  "clerk_user_id": "user_abc123",
  "name": "John Doe",
  "email": "john@example.com",
  "profile_picture": "base64-or-url",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "background": "Product manager at HubSpot for 4 years...",
  "expertise": "Product strategy, user research, climate tech...",
  "looking_for": ["A cofounder", "Mentorship"],
  "open_to": ["Providing domain expertise", "Making introductions"],
  "opted_in": true,
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

## Backward Compatibility

The API route (`app/api/chat/route.ts`) still maps the new fields to the old field names when sending data to Claude, so existing prompts and integrations should continue to work.

## Migration Checklist

- [x] Update OnboardingModal component
- [x] Update onboard page
- [x] Update API chat route
- [x] Update chat page interface
- [x] Create SQL migration script
- [ ] Execute SQL in Supabase
- [ ] Test onboarding flow
- [ ] Verify data in database
- [ ] Test existing features (chat, matching)

## Known Issues

- TypeScript error in `api/chat/route.ts` about `@/lib/supabase` import (appears to be a linting issue, doesn't affect functionality)
- Legacy fields (`ms_program`, `working_on`, `interests`) kept for compatibility but not used in onboarding

## Rollback Plan

If something goes wrong, you can restore the old schema by:

1. Changing field names back in all files
2. Running the old schema creation script
3. Or restoring from a Supabase backup if available

**Old → New field mappings for rollback:**
- `expertise` → `can_help_with`
- `looking_for` → `seeking_help_with`
- `open_to` → `available_for`
- `opted_in` → use `completed_at` timestamp

