# ✅ All Set! Test Your Behavior Tracking

## 🎯 Your System is Ready

Database is clean:
- ✅ `user_behavior` table created
- ✅ `saved_contacts` cleaned (no chat_session_id)
- ✅ `chat_sessions` and `chat_messages` removed
- ✅ All API routes updated

---

## 🧪 Test It Now!

### Step 1: Go to the chat page
**http://localhost:3002/chat**

### Step 2: Search for something
Try: **"climate tech founders"** or **"people with AI/ML background"**

**What happens:**
- Search query sent to AI
- `trackSearch(userId, query)` called automatically
- Embedding generated from your query
- `user_behavior` table updated

### Step 3: Save someone with ❤️
Click the heart icon on any match.

**What happens:**
- Contact saved to `saved_contacts`
- `trackSave(userId, savedProfileId)` called automatically
- Saved person's embedding blended into your behavior
- Engagement score +5 points

### Step 4: Check the data in Supabase

Go to: **https://bxfanzbawibpwkdwexal.supabase.co/project/_/editor**

Run this query:

```sql
SELECT 
  u.email,
  u.name,
  ub.engagement_score,
  ub.total_searches,
  ub.total_saves,
  ub.recent_search_terms[1:3] as last_3_searches,
  ub.last_interaction
FROM user_behavior ub
JOIN users u ON ub.user_id = u.user_id
ORDER BY ub.last_interaction DESC
LIMIT 10;
```

You should see:
- Your email
- `engagement_score` increasing
- `total_searches` counting up
- `total_saves` counting up  
- `recent_search_terms` with your queries
- `last_interaction` updating

---

## 🧠 What's Learning:

### Every Search:
```
"climate tech founders"
  ↓
Embedding generated from query text
  ↓
Blended into avg_embedding (20% new, 80% old)
  ↓
Added to recent_search_terms array
  ↓
engagement_score += 2
```

### Every Save:
```
Click ❤️ on "John Doe (Climate Tech Founder)"
  ↓
Fetch John's profile embedding
  ↓
Blend John's embedding into your behavior (30% new, 70% old)
  ↓
engagement_score += 5
```

**Result:** Your `avg_embedding` evolves to represent what you're **actually** interested in, not just what's in your static profile.

---

## 🎯 Next: Run Adaptive Clustering

Once you have some behavioral data:

```bash
cd /Users/annie/Documents/mooring_webapp
node scripts/detect-clusters-adaptive.js
```

This will:
1. Load all users' profile embeddings
2. Load all users' behavior embeddings (if they have any)
3. Blend them: `profile (70%) + behavior (30%)`
4. Run k-means clustering on the blended embeddings
5. Create clusters that reflect **real interests**

**Before:** Clusters based on stated profiles  
**After:** Clusters based on actual search + save behavior

---

## 📊 Expected Behavior

### First Search:
```sql
-- Before: No record
SELECT * FROM user_behavior WHERE user_id = 'your_id';
-- Result: 0 rows

-- After: Record created
SELECT * FROM user_behavior WHERE user_id = 'your_id';
-- Result:
-- engagement_score: 2
-- total_searches: 1
-- total_saves: 0
-- recent_search_terms: {"climate tech founders"}
-- avg_embedding: [0.123, -0.456, ...] (1536 dimensions)
```

### First Save:
```sql
-- After save
SELECT * FROM user_behavior WHERE user_id = 'your_id';
-- Result:
-- engagement_score: 7  (2 + 5)
-- total_searches: 1
-- total_saves: 1
-- recent_search_terms: {"climate tech founders"}
-- avg_embedding: [updated with saved person's embedding]
```

---

## 🐛 Troubleshooting

### If tracking doesn't work:

1. **Check browser console:**
   ```
   ✅ Should see: "✅ Behavior learning: contact saved"
   ❌ If error: Check network tab for failed API calls
   ```

2. **Check Supabase logs:**
   Go to: **Logs → API**
   Look for POST requests to `/api/behavior/track-*`

3. **Verify endpoints exist:**
   ```bash
   ls app/api/behavior/
   # Should show:
   # track-save/
   # track-search/
   # track-view/
   ```

4. **Check environment variables:**
   ```bash
   cat .env.local | grep OPENAI_API_KEY
   # Should have your OpenAI key for embeddings
   ```

---

## 🎉 Success Looks Like:

1. ✅ Search works
2. ✅ Save works
3. ✅ `user_behavior` table fills up
4. ✅ Engagement scores increase
5. ✅ No console errors
6. ✅ Ready for adaptive clustering!

---

**Your platform is now continuously learning!** 🧠✨





