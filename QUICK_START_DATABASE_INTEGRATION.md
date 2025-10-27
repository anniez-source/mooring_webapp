# Quick Start: Database Integration Setup

## 🚀 Get Everything Working in 5 Minutes

### Step 1: Run SQL Scripts in Supabase

Open Supabase SQL Editor and run these scripts **in order**:

1. **Fix chat_sessions table:**
```sql
-- Run: fix_chat_sessions_table.sql
```

2. **Create chat_messages table:**
```sql
-- Run: create_chat_messages_table.sql
```

3. **Add click tracking:**
```sql
-- Run: add_click_tracking_to_saved_contacts.sql
```

4. **Create organization tables (optional):**
```sql
-- Run: create_organization_tables.sql
```

---

### Step 2: Test Chat Message Storage

1. Go to http://localhost:3000/chat
2. Send a message: "I'm looking for a technical cofounder"
3. Check Supabase:
   - `chat_sessions` table should have a new session
   - `chat_messages` table should have 2 rows (user + assistant)
   - `metadata` column should contain `query_intent` and `matched_profiles`

---

### Step 3: Test Click Tracking

1. In the chat, expand a match card
2. Click the "Email" button
3. Check Supabase `saved_contacts` table:
   - `email_clicked` should be `true` for that contact

4. Click the "LinkedIn" button
5. Check again:
   - `linkedin_clicked` should now also be `true`

---

### Step 4: (Optional) Set Up Organizations

If you want multi-tenancy (users only see matches from their organizations):

1. Run `create_organization_tables.sql`
2. Assign users to organizations:

```sql
-- Example: Add a user to Roux Institute
INSERT INTO organization_members (user_id, org_id, role)
VALUES (
  '[user_id from users table]',
  (SELECT org_id FROM organizations WHERE name = 'Roux Institute'),
  'member'
);
```

3. Once users have organizations, profile filtering automatically activates!

---

## ✅ Verify Everything Works

### Check Chat Storage:
```sql
-- View recent chat sessions
SELECT cs.*, u.name, u.email, 
       (SELECT COUNT(*) FROM chat_messages WHERE chat_session_id = cs.chat_id) as message_count
FROM chat_sessions cs
JOIN users u ON cs.user_id = u.user_id
ORDER BY cs.created_at DESC
LIMIT 10;

-- View chat messages with metadata
SELECT cm.*, cs.title
FROM chat_messages cm
JOIN chat_sessions cs ON cm.chat_session_id = cs.chat_id
ORDER BY cm.created_at DESC
LIMIT 20;
```

### Check Click Tracking:
```sql
-- View saved contacts with click analytics
SELECT 
  u.name as user_name,
  p.name as saved_contact_name,
  sc.email_clicked,
  sc.linkedin_clicked,
  sc.created_at
FROM saved_contacts sc
JOIN users u ON sc.user_id = u.user_id
JOIN profiles p ON sc.saved_profile_id = p.user_id
ORDER BY sc.created_at DESC;
```

### Check Organization Filtering:
```sql
-- See which users are in which organizations
SELECT 
  u.name as user_name,
  o.name as organization_name,
  om.role,
  om.joined_at
FROM organization_members om
JOIN users u ON om.user_id = u.user_id
JOIN organizations o ON om.org_id = o.org_id
ORDER BY o.name, u.name;
```

---

## 🎯 What You Can Do Now

### 1. Analytics Queries

**Most active users:**
```sql
SELECT u.name, u.email, 
       COUNT(DISTINCT cs.chat_id) as sessions,
       COUNT(cm.message_id) as messages
FROM users u
LEFT JOIN chat_sessions cs ON u.user_id = cs.user_id
LEFT JOIN chat_messages cm ON cs.chat_id = cm.chat_session_id
GROUP BY u.user_id, u.name, u.email
ORDER BY messages DESC;
```

**Most saved profiles:**
```sql
SELECT p.name, p.email,
       COUNT(*) as times_saved,
       SUM(CASE WHEN sc.email_clicked THEN 1 ELSE 0 END) as email_clicks,
       SUM(CASE WHEN sc.linkedin_clicked THEN 1 ELSE 0 END) as linkedin_clicks
FROM profiles p
JOIN saved_contacts sc ON p.user_id = sc.saved_profile_id
GROUP BY p.user_id, p.name, p.email
ORDER BY times_saved DESC;
```

**Match quality (from metadata):**
```sql
SELECT 
  cm.metadata->>'query_intent' as query,
  jsonb_array_length(cm.metadata->'matched_profiles') as matches_returned,
  cm.created_at
FROM chat_messages cm
WHERE cm.role = 'assistant'
  AND cm.metadata IS NOT NULL
ORDER BY cm.created_at DESC;
```

### 2. User Management

**Bulk add users to an organization:**
```sql
INSERT INTO organization_members (user_id, org_id, role)
SELECT u.user_id, 
       (SELECT org_id FROM organizations WHERE name = 'Roux Institute'),
       'member'
FROM users u
WHERE u.email LIKE '%@northeastern.edu'
ON CONFLICT DO NOTHING;
```

**See users not in any organization:**
```sql
SELECT u.user_id, u.name, u.email
FROM users u
LEFT JOIN organization_members om ON u.user_id = om.user_id
WHERE om.user_id IS NULL;
```

---

## 🔧 Troubleshooting

### Chat messages not saving?
1. Check browser console for errors
2. Verify Clerk authentication is working
3. Check Supabase logs for database errors
4. Ensure `chat_sessions` table exists and has correct foreign key

### Click tracking not working?
1. Verify `email_clicked` and `linkedin_clicked` columns exist
2. Check that contact is already saved (tracking only works for saved contacts)
3. Look at network tab to see if `/api/track-click` is being called

### Organization filtering not working?
1. Verify `organizations` and `organization_members` tables exist
2. Check that users are assigned to organizations
3. Look at chat API logs - should say "User has X organizations"
4. If no orgs assigned, it falls back to showing all profiles (this is expected)

---

## 📊 Next Steps

1. **Enable RLS (Row Level Security)** in Supabase for production
2. **Create admin dashboard** to view analytics
3. **Add email notifications** when someone saves your profile
4. **Build conversation history** UI to view past chats
5. **Export analytics** for reporting

---

## 🎉 You're All Set!

Your database integration is complete and working. The app now:
- ✅ Stores all conversations for analytics
- ✅ Tracks email/LinkedIn engagement
- ✅ Supports multi-tenancy with organizations
- ✅ Maintains session continuity
- ✅ Fails gracefully without breaking UX

Questions? Check `DATABASE_INTEGRATION_SUMMARY.md` for full technical details.

