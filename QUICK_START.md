# 🚀 Quick Start: Add user_behavior Table

## Step 1: Run SQL in Supabase (2 minutes)

1. **Open Supabase SQL Editor**: https://bxfanzbawibpwkdwexal.supabase.co/project/_/sql/new

2. **Copy and paste** the contents of `add_user_behavior_table.sql`

3. **Click "Run"** (or Cmd+Enter)

4. **Verify**: You should see "Success. No rows returned"

---

## Step 2: Test It! (1 minute)

### Restart your dev server:
```bash
cd /Users/annie/Documents/mooring_webapp
npm run dev
```

### Try it out:
1. Go to http://localhost:3002/chat
2. Search for something: "climate tech founders"
3. Click ❤️ to save a contact

### Check the data in Supabase:
```sql
-- See your behavioral data
SELECT 
  u.email,
  ub.engagement_score,
  ub.total_searches,
  ub.total_saves,
  ub.recent_search_terms[1:3] as recent_searches,
  ub.last_interaction
FROM user_behavior ub
JOIN users u ON ub.user_id = u.user_id
ORDER BY ub.last_interaction DESC
LIMIT 10;
```

You should see your searches and saves being tracked! 🎉

---

## Step 3: Run Adaptive Clustering (when you have data)

Once you have some behavioral data from users:

```bash
node scripts/detect-clusters-adaptive.js
```

This will:
- ✅ Blend profile embeddings (70%) + behavior embeddings (30%)
- ✅ Create clusters based on **real interests**, not just stated profiles
- ✅ Improve recommendations based on actual behavior

---

## What's Tracking Now:

### 🔍 Every Search
```typescript
// In app/chat/page.tsx, when user sends a message
trackSearch(userId, searchQuery)
```
**Tracks:** Query text → Generates embedding → Updates `avg_embedding`

### ❤️ Every Save
```typescript
// When user clicks the heart icon
trackSave(userId, savedProfileId)
```
**Tracks:** Who they saved → Blends that person's embedding into their behavior  
**Engagement:** +5 points per save (strong signal)

### 👁️ Profile Views (optional)
```typescript
// You can add this to profile pages later
trackProfileView(userId, viewedProfileId)
```
**Tracks:** Who they're interested in → +1 engagement point per view

---

## Engagement Score Formula

```
Score = 
  min(30, total_searches × 2) +     // Search activity (0-30)
  min(40, total_saves × 5) +         // Saves (0-40, strongest signal)
  min(30, total_views × 1)           // Views (0-30)
  
Max = 100 points
```

Higher engagement = more weight given to behavior vs static profile in clustering

---

## Next Level: Decay Old Behavior (Optional)

To keep profiles fresh, run this monthly:

```sql
-- Reduce engagement for inactive users
UPDATE user_behavior 
SET engagement_score = engagement_score * 0.9
WHERE last_interaction < NOW() - INTERVAL '30 days';
```

---

## 🎯 Summary

**Before:** Static clusters based on profile text  
**After:** Dynamic clusters that learn from every search and save

Your platform now **evolves like a living organism** 🌱 - getting smarter with every interaction!





