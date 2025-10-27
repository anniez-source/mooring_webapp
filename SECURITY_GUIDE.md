# 🔒 Security Guide

## Current Security Status: ⚠️ NEEDS FIX

### Critical Issues to Address

1. **❌ Row Level Security (RLS) Not Enabled**
   - Most tables are wide open to authenticated users
   - Anyone can query other users' data via browser console

2. **❌ Shared Supabase Client**
   - Same client used for frontend and backend
   - Uses public anon key everywhere

---

## 🚨 Immediate Action Required

### Step 1: Enable RLS (CRITICAL - Do This First)

Run this SQL in Supabase:

```bash
enable_row_level_security.sql
```

This will:
- ✅ Enable RLS on all tables
- ✅ Create organization-scoped access policies
- ✅ Prevent users from accessing other orgs' data
- ✅ Secure chat messages, saved contacts, profiles

**Expected result:** Users can only see data from their own organization

---

### Step 2: Test RLS is Working

After running the SQL, test in your browser console:

```javascript
// This should now return ONLY profiles from your org
const { data } = await supabase.from('profiles').select('*');
console.log(data); // Should be limited to your organization

// This should return ONLY your own chat sessions
const { data: sessions } = await supabase.from('chat_sessions').select('*');
console.log(sessions); // Should only show your sessions

// This should return ONLY your saved contacts
const { data: contacts } = await supabase.from('saved_contacts').select('*');
console.log(contacts); // Should only show your saves
```

---

## 🔐 RLS Policies Explained

### How RLS Works

With RLS enabled, Supabase automatically filters queries based on the current user's JWT token:

```sql
-- When a user queries profiles, Supabase automatically adds:
WHERE user_id IN (
  SELECT user_id FROM organization_members
  WHERE org_id IN (/* user's orgs */)
)
```

### Policies Created

| Table | Policy | What It Does |
|-------|--------|--------------|
| **users** | View org members | See users in your organizations |
| **profiles** | View org profiles | See profiles from your organizations |
| **organizations** | View own orgs | See only organizations you belong to |
| **organization_members** | View org members | See members of your organizations |
| **chat_sessions** | Own sessions only | See/edit only your chat sessions |
| **chat_messages** | Own messages only | See messages from your sessions only |
| **saved_contacts** | Own contacts only | See/edit only your saved contacts |

### Multi-Org Support

If a user belongs to multiple organizations:
- They see profiles from **all** their organizations
- Chat sessions are scoped to **one** organization (the primary org)
- Saved contacts are always personal (not shared)

---

## 🛡️ Additional Security Measures

### 1. Environment Variables

**Current setup (OK for development):**
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Why this is OK:**
- `NEXT_PUBLIC_` variables are exposed to browser (by design)
- RLS protects data access
- Anon key is meant to be public (with RLS enabled)

**For Production:**
- ✅ Keep `NEXT_PUBLIC_` vars (they're safe with RLS)
- ✅ Add rate limiting at Supabase level
- ✅ Enable Supabase Auth JWT verification
- ❌ Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend

---

### 2. API Route Protection

**Current setup:** ✅ Already using Clerk auth

```typescript
// In API routes
const { userId } = auth();
if (!userId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**This is good!** Even if someone bypasses the frontend, API routes check authentication.

---

### 3. Input Validation

**Current setup:** ✅ Using Supabase parameterized queries

```typescript
// Safe - parameterized
.eq('user_id', userData.user_id)

// Would be unsafe - string concatenation
// DON'T DO: .select(`* WHERE user_id = '${userId}'`)
```

Supabase automatically prevents SQL injection.

---

### 4. Click Tracking Privacy

**Current implementation:**
- Tracks when users click email/LinkedIn
- Stored in `saved_contacts` table
- **Visible only to the person who saved the contact**

**Privacy considerations:**
- ✅ User A can't see if User B clicked their links
- ✅ Only admins with database access can see click data
- ✅ Could be used for engagement analytics

---

## 🚫 What RLS Does NOT Protect

### 1. Database-Level Admin Access
- Supabase dashboard users (you) can see all data
- Service role key bypasses RLS

### 2. Server-Side Code
- API routes using service role key bypass RLS
- Always validate permissions in API routes

### 3. Supabase Edge Functions
- Must check permissions manually if using service role

---

## 📋 Security Checklist

Before going to production:

- [ ] **Run `enable_row_level_security.sql`**
- [ ] **Test RLS policies** (try querying other users' data)
- [ ] **Verify organization filtering** (users only see their org)
- [ ] **Check Clerk authentication** is working
- [ ] **Enable Supabase rate limiting** (in dashboard)
- [ ] **Set up monitoring** (Supabase logs)
- [ ] **Review Supabase auth settings** (password requirements, MFA)
- [ ] **Enable SSL** (should be on by default)
- [ ] **Audit who has database access** (Supabase dashboard users)

---

## 🔍 How to Audit Security

### Check RLS Status

```sql
-- See which tables have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Should show TRUE for all your tables
```

### Check Current User Context

```sql
-- See what user the query is running as
SELECT auth.jwt()->>'sub' as clerk_user_id;

-- See what data you can access
SELECT COUNT(*) FROM profiles;  -- Should be limited by RLS
```

### Test Cross-Org Access

1. Create two users in different organizations
2. Try to query the other user's profile from browser console
3. Should return empty result or error

---

## 🆘 Common Security Questions

### "Can users see other users' profiles?"

✅ **Yes, but only from their organization.** This is intentional for the matching feature.

If you want profiles to be completely private:
```sql
-- Change profiles policy to only show own profile
CREATE POLICY "Users can view only own profile" ON profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT user_id FROM users WHERE clerk_user_id = auth.jwt()->>'sub'));
```

### "Can users see other users' chat messages?"

❌ **No.** Chat messages are strictly scoped to the session owner.

### "Can admins see all data?"

✅ **Yes.** Anyone with:
- Supabase dashboard access
- Service role key
- Database connection string

Can bypass RLS and see everything. **Limit dashboard access carefully.**

### "What if I need to query across organizations?"

Use the service role key in **server-side API routes only**:

```typescript
// In API route (server-side)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Never expose this!
);

// This bypasses RLS - use carefully!
const { data } = await supabaseAdmin.from('profiles').select('*');
```

---

## 📚 Further Reading

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Clerk Security](https://clerk.com/docs/security)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

---

## Summary

**Right now:** ❌ **Not secure - anyone can query your database**

**After running `enable_row_level_security.sql`:** ✅ **Secure - users only see their own organization's data**

**Run that SQL file NOW** before deploying or adding more users!

