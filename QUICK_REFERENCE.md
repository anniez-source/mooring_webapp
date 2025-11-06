# 🚢 Mooring - Quick Reference

**TL;DR:** AI-powered community connection platform using semantic search + behavioral learning

---

## 🎯 What It Does

Helps people find meaningful collaborations by:
- **Semantic search** with 1536D embeddings
- **AI explanations** for every match (Claude)
- **Cross-domain matching** (finds transferable skills)
- **Auto-clustering** into sub-communities
- **Learns from behavior** (searches, saves, views)

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 + React 18 + TypeScript + Tailwind |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL + pgvector) |
| **Auth** | Clerk |
| **AI - Embeddings** | OpenAI text-embedding-3-small (1536D) |
| **AI - Matching** | Anthropic Claude Sonnet 4.5 |
| **Clustering** | K-means (scikit-learn) |
| **Hosting** | Vercel |

---

## 🔑 Core Concepts

### 1. **Embeddings** (Semantic Vectors)
- Every profile → 1536-dimensional vector
- Similar profiles = close in vector space
- Built from: background + expertise + interests + how_i_help

### 2. **Hybrid Search**
```
User Query + Profile Context
    ↓ OpenAI
1536D Query Embedding
    ↓ pgvector
Top 20 Similar Profiles (vector search)
    ↓ Claude AI
Top 6 Ranked with Explanations
    ↓ Frontend
Display to User
```

### 3. **Behavior Learning**
```
User Searches → Track Query → Update avg_embedding
User Saves → Track Profile → Blend into avg_embedding (strong signal)
User Views → Track View → Increment engagement_score
```

### 4. **Clustering**
```
All Profile Embeddings
    ↓ K-means (K=5-12)
Test Silhouette Scores
    ↓ Pick Best K
Assign Members to Clusters
    ↓ Extract Keywords
Label Clusters (e.g., "Climate Tech, ML, Carbon")
```

---

## 📊 Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Clerk → Database user mapping |
| `profiles` | User profile + embedding (1536D) |
| `user_behavior` | avg_embedding, searches, saves, engagement |
| `saved_contacts` | User's saved people |
| `community_clusters` | Auto-generated communities |
| `cluster_members` | Junction: user ↔ cluster |
| `organizations` | Multi-tenancy |

---

## 🚀 Quick Commands

```bash
# Development
npm run dev              # Start localhost:3000
npm run build            # Production build
npm run lint             # Check code

# Database
psql $DATABASE_URL       # Connect to Supabase

# Clustering
node scripts/generate-embeddings.js    # Generate embeddings
node scripts/detect-clusters.js        # Run clustering

# Deployment
vercel --prod            # Deploy to production
git push origin main     # Auto-deploy via Vercel
```

---

## 🔐 Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

---

## 🔌 Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | AI search for people |
| `/api/save-collaborator` | POST | Save contact |
| `/api/clusters` | GET | List communities |
| `/api/clusters/[id]/members` | GET | Get cluster members |
| `/api/check-saved` | POST | Check saved profiles |
| `/api/behavior/track-search` | POST | Track search |
| `/api/behavior/track-save` | POST | Track save |
| `/api/behavior/track-view` | POST | Track view |

---

## 🎨 Key Components

| File | Purpose |
|------|---------|
| `app/chat/page.tsx` | AI search interface |
| `app/communities/page.tsx` | Cluster list |
| `app/communities/[clusterId]/page.tsx` | Cluster detail |
| `app/saved/page.tsx` | Saved contacts |
| `app/profile/page.tsx` | Profile editor |
| `app/components/OnboardingModal.tsx` | First-time setup |

---

## 🧠 Matching Logic

**1. Domain/Expertise Search**
- User: "climate tech founders"
- Matches: Anyone with "climate" in background/expertise/interests
- Generous semantic matching

**2. Help Type Search**
- User: "coffee chat"
- Matches: ONLY profiles with `how_i_help: ["coffee_chats"]`
- Strict filtering

**3. Cross-Domain Matching**
- "scalability challenges" → infrastructure, distributed systems, platform architecture
- "storytelling" → data viz, UX research, product marketing
- Finds transferable skills across domains

---

## 📈 Performance

| Metric | Value |
|--------|-------|
| Embedding generation | ~200ms |
| Vector search (top 20) | ~50ms |
| Claude ranking | ~2-3s |
| Total search time | ~3-4s |
| Scales to | 10,000+ profiles |

---

## 🐛 Troubleshooting

**No search results?**
- Check user opted in (`profiles.opted_in = true`)
- Verify embedding exists
- Lower similarity threshold (default 45%)

**Embeddings not generating?**
- Check `OPENAI_API_KEY` in environment
- Verify profile has required fields

**RLS blocking queries?**
- Check user in `organization_members` table
- Verify RLS policies in Supabase dashboard

**Build failing?**
- Check all environment variables in Vercel
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify OpenAI client lazy-loading

---

## 📚 Full Docs

- **HOW_IT_WORKS.md** - Complete system documentation (this file's big brother)
- **DATABASE_INTEGRATION_SUMMARY.md** - Database setup
- **EMBEDDING_SETUP.md** - Embedding system
- **CLUSTERING_OPTIMIZATION_SUMMARY.md** - Clustering guide

---

*Quick ref | See HOW_IT_WORKS.md for details*

