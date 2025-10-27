# 🔒 Row Level Security (RLS) Workflow Guide

## How Data Access Works Now

With RLS enabled, every database query is automatically filtered based on the **logged-in user's JWT token**. Here's what happens for each table:

---

## 📋 Table-by-Table Workflow

### 1. **USERS** Table

**What users can see:**
```javascript
// User queries:
const { data } = await supabase.from('users').select('*');

// RLS automatically filters to:
// "Show me all users who belong to the same organizations as me"
```

**Workflow:**
- ✅ **SELECT**: Can view all users in their organization(s)
- ✅ **INSERT**: Can create their own user record (on signup)
- ✅ **UPDATE**: Can update their own record only
- ❌ **DELETE**: Not allowed

**Example:**
```
User A (Test Environment) queries users
→ Sees: All Test Environment members
→ Doesn't see: Nexus Maine members

User B (Nexus Maine + Test Environment) queries users  
→ Sees: All Nexus Maine members + All Test Environment members
→ Combined view across both orgs
```

---

### 2. **PROFILES** Table

**What users can see:**
```javascript
// User queries:
const { data } = await supabase.from('profiles').select('*');

// RLS filters to:
// "Show me my own profile + opted-in profiles from my organizations"
```

**Workflow:**
- ✅ **SELECT**: Can view their own profile + opted-in profiles from their organization(s)
- ✅ **INSERT**: Can create their own profile (onboarding)
- ✅ **UPDATE**: Can update their own profile only
- ❌ **DELETE**: Not allowed

**Example:**
```
User A searches for a technical cofounder
→ AI receives: All opted-in profiles from User A's organizations
→ AI matches: Only shows relevant people from same org(s)
→ User A sees: Name, background, expertise, looking_for, open_to
→ User A CANNOT see: Non-opted-in profiles (database enforced!)
→ User A CANNOT see: Profiles from other organizations

User B (opted_in = false) queries profiles
→ Sees: Only their own profile
→ Doesn't see: Any other profiles (not visible for matching)
```

**Privacy Note:** 
- ✅ **Opted-in users**: Visible to others in same org (needed for AI matching)
- ❌ **Opted-out users**: Hidden from everyone except themselves
- ✅ **Own profile**: Always visible to yourself (for profile page)

---

### 3. **ORGANIZATIONS** Table

**What users can see:**
```javascript
// User queries:
const { data } = await supabase.from('organizations').select('*');

// RLS filters to:
// "Show me only organizations I'm a member of"
```

**Workflow:**
- ✅ **SELECT**: Can view organizations they belong to
- ❌ **INSERT/UPDATE/DELETE**: Not allowed (admin-only via SQL)

**Example:**
```
User A (Test Environment member)
→ Queries organizations
→ Sees: { name: "Test Environment", org_id: "..." }
→ Doesn't see: Nexus Maine or any other orgs

User B (member of both orgs)
→ Sees: Both Test Environment AND Nexus Maine
```

---

### 4. **ORGANIZATION_MEMBERS** Table

**What users can see:**
```javascript
// User queries:
const { data } = await supabase.from('organization_members').select('*');

// RLS filters to:
// "Show me all members of my organizations"
```

**Workflow:**
- ✅ **SELECT**: Can view all members of their organization(s)
- ✅ **INSERT**: Can add themselves to an org (if they have an invite - future feature)
- ❌ **UPDATE/DELETE**: Not allowed

**Example:**
```
User A wants to see who else is in Test Environment
→ Queries organization_members
→ Sees: All user_id's + roles in Test Environment
→ Can join with users table to get names/emails
```

---

### 5. **CHAT_SESSIONS** Table

**What users can see:**
```javascript
// User queries:
const { data } = await supabase.from('chat_sessions').select('*');

// RLS filters to:
// "Show me ONLY my own chat sessions"
```

**Workflow:**
- ✅ **SELECT**: Can view their own chat sessions only
- ✅ **INSERT**: Can create new chat sessions
- ✅ **UPDATE**: Can update their own sessions (e.g., update `last_message_at`)
- ❌ **DELETE**: Not allowed

**Example:**
```
User A has 3 chat sessions:
- "Looking for technical cofounder" (session_1)
- "Need marketing advice" (session_2)
- "Seeking introductions" (session_3)

User A queries chat_sessions
→ Sees: All 3 of their own sessions
→ Doesn't see: Any other user's sessions

User B queries chat_sessions
→ Sees: Only their own sessions
→ CANNOT see User A's sessions (privacy protected!)
```

**Privacy:** ✅ **Complete isolation - no one can see your conversations**

---

### 6. **CHAT_MESSAGES** Table

**What users can see:**
```javascript
// User queries:
const { data } = await supabase
  .from('chat_messages')
  .select('*')
  .eq('chat_session_id', 'some_session_id');

// RLS filters to:
// "Show me messages ONLY from my own chat sessions"
```

**Workflow:**
- ✅ **SELECT**: Can view messages from their own sessions only
- ✅ **INSERT**: Can add messages to their own sessions
- ❌ **UPDATE/DELETE**: Not allowed (preserve message history)

**Example:**
```
User A tries to read messages from session_1 (their own)
→ ✅ Success: Returns all messages from that session

User A tries to read messages from session_999 (belongs to User B)
→ ❌ Returns empty array (RLS blocks access)

User B tries to query all messages
→ Only sees messages from their own sessions
→ Cannot see User A's messages
```

**Privacy:** ✅ **Strongest protection - messages are completely private**

---

### 7. **SAVED_CONTACTS** Table

**What users can see:**
```javascript
// User queries:
const { data } = await supabase.from('saved_contacts').select('*');

// RLS filters to:
// "Show me ONLY contacts that I saved"
```

**Workflow:**
- ✅ **SELECT**: Can view their own saved contacts only
- ✅ **INSERT**: Can save new contacts
- ✅ **UPDATE**: Can update their own saves (for click tracking)
- ✅ **DELETE**: Can delete their own saved contacts

**Example:**
```
User A saves 5 profiles to their saved contacts
User B saves 3 profiles to their saved contacts

User A queries saved_contacts
→ Sees: Their 5 saved contacts
→ Doesn't see: User B's 3 saved contacts

User A clicks email button on saved contact
→ Updates email_clicked = true
→ Only on their own saved contact record

User A deletes a saved contact
→ Removes from their saved_contacts
→ Doesn't affect the actual profile
→ Other users' saves are unaffected
```

**Privacy:** ✅ **Saved contacts are completely private to each user**

---

### 8. **COMMUNITY_THEMES** Table (if exists)

**What users can see:**
```javascript
// User queries:
const { data } = await supabase.from('community_themes').select('*');

// RLS filters to:
// "Show me themes generated for my organizations"
```

**Workflow:**
- ✅ **SELECT**: Can view themes from their organization(s)
- ❌ **INSERT/UPDATE/DELETE**: Only via API routes (admin functionality)

**Example:**
```
Admin generates community themes for Test Environment
→ Stores: { org_id: test_env_id, themes: {...}, generated_at: ... }

User A (Test Environment) views analytics page
→ Sees: Themes for Test Environment

User B (Nexus Maine) views analytics page
→ Sees: Themes for Nexus Maine
→ Doesn't see: Test Environment themes
```

---

## 🔄 Real-World User Journeys

### Journey 1: New User Signs Up

```
1. User signs up with Clerk
   ✅ Creates record in users table (RLS allows: clerk_user_id = their JWT)

2. Trigger auto-assigns to Test Environment
   ✅ Creates record in organization_members
   
3. User completes onboarding
   ✅ Creates record in profiles table (RLS allows: user_id = their user_id)
   
4. User is now visible to others in Test Environment for matching
```

---

### Journey 2: User Searches for Matches

```
1. User sends message: "I need a technical cofounder"

2. API fetches profiles:
   const { data } = await supabase.from('profiles').select('*');
   
   RLS automatically filters to:
   - ✅ Users in Test Environment
   - ✅ opted_in = true
   - ❌ Excludes other organizations
   - ❌ Excludes their own profile

3. API creates chat_session:
   - user_id: current_user
   - org_id: test_environment_id
   - RLS allows: user_id matches JWT

4. API stores user message:
   - chat_session_id: session_1
   - role: 'user'
   - RLS allows: session belongs to current user

5. Claude processes and responds

6. API stores assistant message:
   - Same session
   - role: 'assistant'
   - RLS allows: session belongs to current user
```

---

### Journey 3: User Saves a Contact

```
1. User clicks heart button on matched profile

2. Frontend calls /api/save-collaborator:
   {
     saved_profile_id: "profile_123",
     chat_session_id: "session_1",
     reason: "Great technical background..."
   }

3. API inserts into saved_contacts:
   RLS checks:
   - ✅ user_id matches current user's JWT
   - ✅ Insert allowed
   
4. User navigates to /saved page

5. Frontend queries saved_contacts:
   const { data } = await supabase.from('saved_contacts').select('*');
   
   RLS filters:
   - ✅ Only returns current user's saved contacts
   - ❌ Other users' saves are invisible

6. User clicks email button

7. API updates saved_contacts:
   UPDATE saved_contacts SET email_clicked = true
   WHERE user_id = current_user AND saved_profile_id = "profile_123"
   
   RLS allows:
   - ✅ Update their own record only
```

---

### Journey 4: User Tries to Access Other User's Data (Attack Attempt)

```
1. Malicious user opens browser console

2. Tries to query all profiles:
   const { data } = await supabase.from('profiles').select('*');
   
   RLS filters:
   - ✅ Only returns profiles from their own organization
   - ❌ Cannot see profiles from other orgs

3. Tries to query other user's messages:
   const { data } = await supabase
     .from('chat_messages')
     .select('*')
     .eq('chat_session_id', 'someone_else_session');
   
   RLS blocks:
   - ❌ Returns empty array (session doesn't belong to them)

4. Tries to read someone else's saved contacts:
   const { data } = await supabase.from('saved_contacts').select('*');
   
   RLS filters:
   - ✅ Only returns their own saved contacts
   - ❌ Cannot see other users' saves

RESULT: ✅ Attack fails - RLS protects all data
```

---

## 📊 Privacy Summary

| Data Type | Who Can See It | Privacy Level |
|-----------|----------------|---------------|
| **User records** | Same org members | 🟡 Shared within org |
| **Profiles (opted-in)** | Same org members | 🟡 Shared within org |
| **Profiles (opted-out)** | Owner only | 🟢 Completely private |
| **Own profile** | Always visible to self | 🟢 Always accessible |
| **Chat sessions** | Owner only | 🟢 Completely private |
| **Chat messages** | Owner only | 🟢 Completely private |
| **Saved contacts** | Owner only | 🟢 Completely private |
| **Organizations** | Members only | 🟡 Shared with members |
| **Org members** | Same org members | 🟡 Shared within org |
| **Community themes** | Same org members | 🟡 Shared within org |

---

## 🎯 Key Takeaways

1. **Organization Isolation:**
   - Users from Test Environment cannot see Nexus Maine data
   - Multi-org users see combined view across their orgs

2. **Conversation Privacy:**
   - Chat sessions and messages are **100% private**
   - No one can read your conversations

3. **Saved Contacts Privacy:**
   - Your saved contacts are **completely private**
   - Saved contact's profile can still see other people from their org
   - But they can't see who saved them

4. **Profile Visibility:**
   - Profiles are visible within the same organization
   - This is **intentional** for AI matching to work
   - Only opted-in profiles are shown

5. **Automatic Filtering:**
   - You don't need to add `.eq('user_id', current_user)` to queries
   - RLS handles it automatically
   - Queries fail safely if you try to access unauthorized data

---

## 🔍 How to Verify RLS is Working

### Test 1: Profile Isolation
```javascript
// In browser console
const { data } = await supabase.from('profiles').select('*');
console.log(data.length); // Should only be profiles from your org(s)
```

### Test 2: Chat Privacy
```javascript
// In browser console
const { data } = await supabase.from('chat_sessions').select('*');
console.log(data); // Should only show YOUR sessions

const { data: messages } = await supabase.from('chat_messages').select('*');
console.log(messages); // Should only show YOUR messages
```

### Test 3: Saved Contacts Privacy
```javascript
// In browser console
const { data } = await supabase.from('saved_contacts').select('*');
console.log(data); // Should only show YOUR saved contacts
```

### Test 4: Organization Filtering
```javascript
// Create test users in different orgs
// Log in as User A (Test Environment)
// Try to query User B's profile (Nexus Maine)
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', 'userB@nexusmaine.org');
  
console.log(data); // Should return empty array (different org)
```

---

## ✅ Summary

**Before RLS:** Anyone could query any table and see all data  
**After RLS:** Users only see data from their organization(s), and private data is completely isolated

**Your app is now secure! 🔒**

