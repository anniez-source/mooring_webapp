# 🚢 Mooring: How It Works

**Last Updated:** November 6, 2024  
**Version:** 1.0  
**Deployed:** https://mooring-webapp.vercel.app

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Features](#core-features)
4. [Technology Stack](#technology-stack)
5. [User Flow](#user-flow)
6. [Matching System](#matching-system)
7. [Behavior Learning](#behavior-learning)
8. [Community Clustering](#community-clustering)
9. [Database Schema](#database-schema)
10. [API Endpoints](#api-endpoints)
11. [Authentication & Authorization](#authentication--authorization)
12. [Deployment](#deployment)

---

## 🎯 Overview

**Mooring** is an AI-powered community connection platform that helps people find meaningful collaborations within their innovation communities. Unlike traditional networking platforms that rely on simple keyword matching, Mooring uses:

- **Semantic search** with OpenAI embeddings (1536-dimensional vectors)
- **AI-powered matching** with Claude Sonnet 4.5 for intelligent ranking and explanations
- **Behavioral learning** that adapts to user preferences over time
- **Automatic clustering** using K-means to discover community sub-groups

### Key Differentiators

1. **Context-Aware Search:** Your profile influences search results for better matches
2. **Cross-Domain Matching:** Finds transferable skills (e.g., "scalability" in fintech → climate)
3. **AI Explanations:** Every match comes with a custom "Why You Matched" explanation
4. **Adaptive Learning:** Gets smarter as you search, save, and view profiles
5. **Community Discovery:** Automatically identifies sub-communities based on shared interests

---

## 🏗 Architecture

### High-Level Architecture

```
┌─────────────┐
│   Browser   │
│  (Next.js)  │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
┌──────▼──────┐   ┌─────▼─────┐
│   Clerk     │   │   Vercel  │
│   (Auth)    │   │  (Hosting)│
└─────────────┘   └─────┬─────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
  ┌─────▼─────┐  ┌─────▼──────┐  ┌────▼─────┐
  │  Supabase │  │   OpenAI   │  │ Anthropic│
  │ (Database)│  │(Embeddings)│  │  (Claude)│
  └───────────┘  └────────────┘  └──────────┘
```

### Component Breakdown

**Frontend (Next.js 15)**
- Server-side rendering (SSR) for auth pages
- Client-side interactivity for chat and search
- Real-time UI updates with React state management
- Responsive design with Tailwind CSS

**Backend (Next.js API Routes)**
- RESTful API endpoints in `/app/api/*`
- Server-side authentication with Clerk
- Database operations via Supabase client
- AI integrations (OpenAI + Anthropic)

**Database (Supabase/PostgreSQL)**
- User profiles with pgvector for embeddings
- Behavior tracking for personalization
- Community clusters with junction tables
- Row-level security (RLS) for multi-tenancy

---

## ✨ Core Features

### 1. **AI-Powered Chat Search**
Users chat with an AI assistant to find relevant people:
- Natural language queries: "climate tech founders", "ML engineer for feedback"
- Contextual understanding based on user's profile
- Returns top 6 matches with similarity scores and explanations

**Example:**
```
User: "people working on ocean monitoring"
AI: Here are the top 6 of 11 people working on climate tech, ocean, and marine ecosystems...

**Lennox Johnson** - 87% match
Why relevant: Leading engineering at a Portland climate tech startup building ocean 
monitoring systems. Combines maritime knowledge from Maine Maritime Academy with 
software expertise...
```

### 2. **Smart Matching Algorithm**
Hybrid approach combining:
- **Vector similarity search** (top 20 candidates from embeddings)
- **AI ranking & filtering** (Claude narrows to top 6 and explains)
- **Semantic understanding** (finds cross-domain patterns)

### 3. **Behavior-Based Learning**
The system learns from your interactions:
- **Searches:** Tracked to understand what you're looking for
- **Saves:** Strong signal of interest (weighted 5x)
- **Profile Views:** Indicates engagement

Your "average embedding" evolves as you interact, personalizing future results.

### 4. **Community Clusters**
Automatic discovery of sub-communities:
- **K-means clustering** on profile embeddings
- **Optimized K-value** based on silhouette score
- **Labeled clusters** like "Climate Tech Founders", "ML Engineers", "Healthcare Innovators"

### 5. **Saved Contacts**
Save profiles for later with context:
- **From Chat:** Includes AI-generated "Why You Matched" explanation
- **From Community:** Marked as "Saved from Community"
- **Full Profile View:** Background, interests, expertise, contact info

### 6. **Profile Management**
Rich user profiles with:
- Background, interests, expertise, how they help
- LinkedIn URL and profile picture
- "How I Help" tags (advising, coffee chats, feedback, intros, co-founding)
- Opt-in for discoverability

---

## 🛠 Technology Stack

### Frontend
- **Next.js 15.5.6** - React framework with SSR/SSG
- **React 18.3.1** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Serverless functions
- **Clerk** - Authentication & user management
- **Supabase JS Client** - Database operations
- **OpenAI API** - Embeddings (`text-embedding-3-small`, 1536D)
- **Anthropic API** - Claude Sonnet 4.5 for matching

### Database
- **Supabase (PostgreSQL 15+)** - Managed database
- **pgvector 0.5+** - Vector similarity search
- **ivfflat indexes** - Fast approximate nearest neighbor search

### Machine Learning
- **scikit-learn (Python)** - K-means clustering
- **OpenAI Embeddings** - Semantic vector representations
- **Claude AI** - Natural language understanding & generation

### Deployment
- **Vercel** - Frontend & API hosting
- **GitHub** - Version control
- **Environment Variables** - Secure credential management

---

## 👤 User Flow

### 1. **Onboarding**
```
Sign Up (Clerk) → Complete Profile → Opt-in to Discovery → Generate Embedding
```

**Profile Fields:**
- Name, Email (from Clerk)
- Background (current work)
- Problems They're Obsessed With (interests)
- Expertise (skills, domains)
- How I Help (advising, coffee, feedback, intros, co-founding, not available)
- LinkedIn URL, Profile Picture (optional)

**What Happens Behind the Scenes:**
- Profile saved to `profiles` table
- Embedding generated from: background + expertise + interests + how_i_help
- User assigned to organization (multi-tenancy)
- Clustering script runs nightly to update community groups

### 2. **Finding People (Chat)**
```
Open Chat → Type Query → AI Searches → View Matches → Save/Contact
```

**Query Examples:**
- "people with climate background"
- "ML engineers who offer coffee chats"
- "advisor for go-to-market strategy"

**What Happens:**
1. User's query + profile → contextual embedding
2. Vector search finds top 20 similar profiles (45%+ similarity)
3. Claude ranks top 6 and writes custom explanations
4. User sees matches with:
   - Name, email, LinkedIn
   - Similarity score (%)
   - "Why relevant" explanation
   - Full profile on expand

**Behavior Tracking:**
- Search query saved to `user_behavior.recent_search_terms`
- Query embedding blended into `user_behavior.avg_embedding`
- `total_searches` incremented
- `engagement_score` updated

### 3. **Browsing Communities**
```
View Communities → Pick a Cluster → Browse Members → Filter/Search → Save
```

**What You See:**
- List of community clusters (e.g., "Climate Tech Founders - 12 members")
- Click into cluster → see all members
- Filter by: Domains, Skills, How They Help
- Search by name/keywords
- Save directly with heart button

**Filtering:**
- **Blue tags (Domains):** Climate, Health, AI, Education, Fintech, etc.
- **Gray tags (Skills):** Analytics, ML, Engineering, Design, etc.
- **Yellow tags (How They Help):** Advising, Coffee, Intros, Feedback, Co-founding

### 4. **Saved Contacts**
```
View Saved → Expand Profile → Read "Why You Matched" → Contact
```

**What's Displayed:**
- **Collapsed:** Name, preview text, saved time
- **Expanded:**
  - "Why You Matched" card (gradient background, prominent)
  - Full background, interests, expertise
  - How They Help (colorful pill badges with emojis)
  - Email & LinkedIn buttons

**Contact Actions:**
- Email: `mailto:` link, tracks click
- LinkedIn: External link, tracks click

---

## 🧠 Matching System

### Step 1: Contextual Query Generation
```javascript
buildContextualQuery(userQuery, userProfile) {
  return `
    Query: ${userQuery}
    Searcher background: ${userProfile.background}
    Searcher expertise: ${userProfile.expertise}
    Searcher interests: ${userProfile.interests}
  `
}
```

This enriches the search with your context, so "ML engineers" becomes "ML engineers who align with my climate tech background".

### Step 2: Embedding Generation
```javascript
// OpenAI text-embedding-3-small model
generateEmbedding(contextualQuery)
→ [0.023, -0.154, 0.089, ...] // 1536 dimensions
```

### Step 3: Vector Similarity Search
```sql
SELECT * FROM profiles
WHERE embedding <=> query_embedding < 0.55  -- cosine distance
ORDER BY embedding <=> query_embedding
LIMIT 20
```

Uses `ivfflat` index for fast approximate nearest neighbor search.

### Step 4: AI Ranking & Explanation
Claude receives:
- User's profile context
- Top 20 candidates with similarity scores
- User's query

Claude applies:
- **Domain matching:** Keywords in background/expertise/interests
- **Help type filtering:** If user asks for "coffee chat", ONLY show profiles with `how_i_help: ["coffee_chats"]`
- **Cross-domain matching:** Finds transferable skills (e.g., "scalability" in manufacturing → climate)
- **Ranking:** Selects top 6 most relevant

Claude returns:
```
Here are the top 6 of 11 people who offer coffee chats...

**Name** - 87% match
Why relevant: [2 sentences explaining the match]
```

### Step 5: Response Streaming
Results are streamed back to the frontend in real-time, with match cards rendered progressively.

---

## 📊 Behavior Learning

### Goal
Personalize search results based on user interactions without explicit feedback.

### How It Works

**1. Track Search Queries**
```javascript
trackSearch(userId, searchQuery) {
  // Generate embedding from query
  queryEmbedding = generateEmbedding(searchQuery)
  
  // Blend into average (90% old, 10% new)
  newAvg = 0.9 * currentAvg + 0.1 * queryEmbedding
  
  // Store in user_behavior table
  UPDATE user_behavior SET
    avg_embedding = newAvg,
    recent_search_terms = [last 10 queries],
    total_searches = total_searches + 1
}
```

**2. Track Saves (Strong Signal)**
```javascript
trackSave(userId, savedProfileId) {
  // Get saved profile's embedding
  profileEmbedding = getProfileEmbedding(savedProfileId)
  
  // Blend with higher weight (80% old, 20% profile)
  newAvg = 0.8 * currentAvg + 0.2 * profileEmbedding
  
  // Higher weight because saves are strong interest signals
  UPDATE user_behavior SET
    avg_embedding = newAvg,
    total_saves = total_saves + 1,
    engagement_score = calculateEngagementScore(...)
}
```

**3. Track Profile Views**
```javascript
trackProfileView(userId, viewedProfileId) {
  // Similar to saves but lower weight (95% old, 5% profile)
  UPDATE user_behavior SET
    total_profile_views = total_profile_views + 1
}
```

**4. Engagement Score**
```javascript
calculateEngagementScore(searches, saves, views) {
  score = 0
  score += min(30, searches * 2)     // Max 30 points
  score += min(40, saves * 5)        // Max 40 points (strongest)
  score += min(30, views * 1)        // Max 30 points
  return min(100, score)
}
```

**5. Adaptive Embedding (Future Use)**
```javascript
// Blend profile embedding with behavior embedding
// Higher engagement = more weight on behavior
getAdaptiveEmbedding(userId) {
  profileEmbedding = getProfileEmbedding(userId)
  behaviorEmbedding = getBehaviorEmbedding(userId)
  
  behaviorWeight = min(0.4, 0.2 + engagementScore * 0.002)
  
  return (1 - behaviorWeight) * profileEmbedding 
       + behaviorWeight * behaviorEmbedding
}
```

---

## 🌐 Community Clustering

### Goal
Automatically discover sub-communities within an organization based on shared interests and expertise.

### Algorithm: K-Means with Silhouette Optimization

**Step 1: Collect Profile Embeddings**
```javascript
// Get all opted-in profiles in organization
profiles = SELECT embedding FROM profiles 
           WHERE opted_in = true AND org_id = ?
```

**Step 2: Find Optimal K**
```javascript
// Test K values from 5 to 12
for k in [5, 6, 7, 8, 9, 10, 11, 12]:
  clusters = kmeans(embeddings, k)
  score = calculateSilhouetteScore(embeddings, clusters)
  
// Pick K with highest silhouette score
bestK = argmax(scores)
```

**Silhouette Score:** Measures cluster quality (-1 to 1)
- **0.7-1.0:** Strong, well-separated clusters
- **0.5-0.7:** Reasonable structure
- **0.25-0.5:** Weak but identifiable structure (typical for overlapping communities)
- **<0.25:** No clear structure

**Step 3: Assign Labels**
```javascript
// For each cluster, find most common keywords
getClusterLabel(cluster) {
  keywords = extractKeywords(cluster.members)
  topKeywords = getMostCommon(keywords, 3)
  return topKeywords.join(', ')
}

// Example labels:
// "Climate Tech, Carbon Sequestration, Marine Biology"
// "Machine Learning, Data Science, Analytics"
// "Healthcare, Biotech, Medical Devices"
```

**Step 4: Save to Database**
```sql
INSERT INTO community_clusters (org_id, label, keywords, member_count)
VALUES (?, ?, ?, ?)

-- Junction table for many-to-many
INSERT INTO cluster_members (cluster_id, user_id)
VALUES (?, ?)
```

**Step 5: Display to Users**
- Homepage: List of all clusters
- Cluster detail page: All members with filtering
- User can browse, search, filter, and save contacts

---

## 🗄 Database Schema

### Core Tables

**users** - Maps Clerk users to database
```sql
user_id UUID PRIMARY KEY
clerk_user_id TEXT UNIQUE
email TEXT
name TEXT
created_at TIMESTAMPTZ
```

**profiles** - User profile data + embeddings
```sql
user_id UUID PRIMARY KEY → users.user_id
org_id UUID → organizations.org_id
name TEXT
email TEXT
background TEXT
interests TEXT
expertise TEXT
how_i_help TEXT[]
linkedin_url TEXT
profile_picture TEXT
embedding VECTOR(1536)
opted_in BOOLEAN
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**user_behavior** - Tracks interactions for learning
```sql
user_id UUID PRIMARY KEY → users.user_id
avg_embedding VECTOR(1536)
recent_search_terms TEXT[]
engagement_score FLOAT
total_searches INTEGER
total_saves INTEGER
total_profile_views INTEGER
last_interaction TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

**saved_contacts** - User's saved people
```sql
user_id UUID → users.user_id
saved_profile_id UUID → users.user_id
why_saved TEXT
saved_at TIMESTAMPTZ
PRIMARY KEY (user_id, saved_profile_id)
```

**community_clusters** - Auto-generated communities
```sql
cluster_id UUID PRIMARY KEY
org_id UUID → organizations.org_id
label TEXT
keywords TEXT[]
created_at TIMESTAMPTZ
```

**cluster_members** - Junction table
```sql
cluster_id UUID → community_clusters.cluster_id
user_id UUID → users.user_id
PRIMARY KEY (cluster_id, user_id)
```

**organizations** - Multi-tenancy
```sql
org_id UUID PRIMARY KEY
name TEXT
created_at TIMESTAMPTZ
```

**organization_members** - User-org mapping
```sql
org_id UUID → organizations.org_id
user_id UUID → users.user_id
role TEXT (admin | member)
PRIMARY KEY (org_id, user_id)
```

### Indexes

**Vector Indexes (Fast Similarity Search):**
```sql
CREATE INDEX idx_profiles_embedding 
ON profiles USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_user_behavior_embedding 
ON user_behavior USING ivfflat (avg_embedding vector_cosine_ops)
WITH (lists = 100);
```

**Standard Indexes:**
```sql
CREATE INDEX idx_profiles_org_id ON profiles(org_id);
CREATE INDEX idx_saved_contacts_user_id ON saved_contacts(user_id);
CREATE INDEX idx_cluster_members_cluster_id ON cluster_members(cluster_id);
```

---

## 🔌 API Endpoints

### Authentication (Clerk-Protected)

**POST /api/chat**
- **Purpose:** AI-powered search for people
- **Input:** `{ message, conversationHistory, userProfile }`
- **Output:** Streaming response with match cards
- **Auth:** Required (Clerk)

**POST /api/save-collaborator**
- **Purpose:** Save a contact
- **Input:** `{ userId, savedProfileId, reason }`
- **Output:** `{ success: true }`
- **Auth:** Required

**GET /api/clusters**
- **Purpose:** List all community clusters
- **Output:** `{ clusters: [], orgName, totalClusters }`
- **Auth:** Required

**GET /api/clusters/[clusterId]/members**
- **Purpose:** Get members of a specific cluster
- **Output:** `{ cluster, members: [] }`
- **Auth:** Required

**POST /api/check-saved**
- **Purpose:** Check which profiles user has saved
- **Input:** `{ userId }`
- **Output:** `{ savedProfileIds: [] }`
- **Auth:** Required

**POST /api/track-click**
- **Purpose:** Track email/LinkedIn clicks
- **Input:** `{ userId, savedProfileId, clickType }`
- **Output:** `{ success: true }`
- **Auth:** Required

### Behavior Tracking

**POST /api/behavior/track-search**
- **Purpose:** Track search query for learning
- **Input:** `{ userId, searchQuery }`
- **Auth:** Required

**POST /api/behavior/track-save**
- **Purpose:** Track profile save for learning
- **Input:** `{ userId, savedProfileId }`
- **Auth:** Required

**POST /api/behavior/track-view**
- **Purpose:** Track profile view for learning
- **Input:** `{ userId, viewedProfileId }`
- **Auth:** Required

---

## 🔐 Authentication & Authorization

### Authentication (Clerk)

**Sign Up Flow:**
```
1. User clicks "Sign Up" → Redirected to Clerk
2. Clerk handles email/password or OAuth (Google, GitHub, etc.)
3. Clerk creates user, returns to app with session
4. App creates record in users table (clerk_user_id mapping)
5. User completes profile → profile record created
```

**Sign In Flow:**
```
1. User clicks "Sign In" → Redirected to Clerk
2. Clerk validates credentials, creates session
3. User redirected back to app with session
4. Middleware validates session on every request
```

**Session Management:**
- Clerk handles all session logic (JWTs, refresh tokens)
- Next.js middleware (`middleware.ts`) protects routes
- Public routes: `/`, `/sign-in`, `/sign-up`
- Protected routes: `/chat`, `/communities`, `/profile`, `/saved`

### Authorization (Row-Level Security)

**Supabase RLS Policies:**

```sql
-- Users can only read profiles in their organization
CREATE POLICY "Users can view org profiles"
ON profiles FOR SELECT
USING (org_id IN (
  SELECT org_id FROM organization_members 
  WHERE user_id = auth.uid()
));

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (user_id = auth.uid());

-- Users can only save contacts in their org
CREATE POLICY "Users can save org contacts"
ON saved_contacts FOR INSERT
WITH CHECK (
  saved_profile_id IN (
    SELECT user_id FROM profiles 
    WHERE org_id IN (
      SELECT org_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  )
);
```

**Multi-Tenancy:**
- Each user belongs to 1+ organizations
- Searches and clusters scoped to user's organization
- RLS policies enforce data isolation

---

## 🚀 Deployment

### Vercel (Current)

**Hosting:** https://mooring-webapp.vercel.app

**Configuration:**
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

**Environment Variables (Required):**
- `OPENAI_API_KEY` - OpenAI embeddings
- `ANTHROPIC_API_KEY` - Claude matching
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk server key

**Deployment Process:**
```bash
# Automatic (Git push)
git push origin main
→ Vercel auto-deploys

# Manual (CLI)
vercel --prod
```

**Build Optimizations:**
- ESLint disabled during builds (`eslint.ignoreDuringBuilds: true`)
- Lazy-loading OpenAI client to avoid build-time initialization
- Server-side rendering (SSR) for auth pages
- Static generation (SSG) where possible

### Alternative: Docker

**Dockerfile** included for self-hosting:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Docker Compose** with Nginx:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

---

## 📈 Performance & Scaling

### Current Performance

**Embedding Generation:**
- ~200ms per profile (OpenAI API)
- Cached after generation (only on profile update)

**Vector Search:**
- ~50ms for top 20 candidates (ivfflat index)
- Scales to 10,000+ profiles efficiently

**Claude Matching:**
- ~2-3s for ranking + explanations
- Streamed response for perceived speed

**Database Queries:**
- RLS policies add ~10-20ms overhead
- Indexes on all foreign keys
- Connection pooling via Supabase

### Scaling Considerations

**100 users:**
- Current setup handles easily
- No optimization needed

**1,000 users:**
- Consider upgrading Supabase plan
- Monitor Claude API costs ($15/1M tokens)
- Cache frequent search results

**10,000+ users:**
- Upgrade to HNSW index (better recall, slower build)
- Implement Redis for search result caching
- Rate limiting on API endpoints
- Consider dedicated embedding service

---

## 🔧 Maintenance & Operations

### Daily Operations

**Clustering:**
```bash
# Run nightly via cron or GitHub Actions
npm run generate-embeddings  # Update any changed profiles
node scripts/detect-clusters.js  # Regenerate clusters
```

**Monitoring:**
- Vercel Analytics for page views, errors
- Supabase Dashboard for database health
- OpenAI Usage Dashboard for API costs
- Clerk Dashboard for auth metrics

### Backup & Recovery

**Supabase:**
- Automatic daily backups (retained 7 days)
- Point-in-time recovery available

**Code:**
- Git version control
- Production branch: `main`
- Deployment history in Vercel

### Troubleshooting

**Common Issues:**

1. **Embeddings not generating**
   - Check `OPENAI_API_KEY` in env vars
   - Verify profile has background + expertise + interests

2. **Search returns no results**
   - Check user has opted in (`opted_in = true`)
   - Verify embeddings exist in database
   - Lower similarity threshold in code

3. **RLS blocking queries**
   - Verify user in organization_members table
   - Check RLS policies in Supabase

4. **Cluster labels are generic**
   - Run clustering with more profiles (min 50)
   - Adjust keyword extraction logic

---

## 📚 Additional Resources

**Codebase Documentation:**
- `DATABASE_INTEGRATION_SUMMARY.md` - Database setup guide
- `EMBEDDING_SETUP.md` - Embedding system details
- `CLUSTERING_OPTIMIZATION_SUMMARY.md` - Clustering guide
- `KMEANS_VS_DBSCAN.md` - Algorithm comparison
- `RLS_WORKFLOW_GUIDE.md` - Security policies
- `DEPLOYMENT.md` - Deployment instructions

**External Docs:**
- [Next.js Docs](https://nextjs.org/docs)
- [Clerk Auth](https://clerk.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [pgvector](https://github.com/pgvector/pgvector)

---

## 🎯 Future Enhancements

### Short-Term
- [ ] Email notifications for new matches
- [ ] Profile completeness score
- [ ] Advanced filters (location, availability)
- [ ] Export saved contacts to CSV

### Medium-Term
- [ ] Direct messaging within platform
- [ ] Group chat for clusters
- [ ] Calendar integration for coffee chats
- [ ] Mobile app (React Native)

### Long-Term
- [ ] AI-suggested introductions
- [ ] Automated follow-ups
- [ ] Impact tracking (successful connections)
- [ ] Multi-language support

---

## 👥 Contributing

**Development Setup:**
```bash
git clone https://github.com/anniez-source/mooring_webapp
cd mooring_webapp
npm install
cp .env.example .env.local  # Add your API keys
npm run dev  # Start at localhost:3000
```

**Code Style:**
- TypeScript for type safety
- ESLint + Prettier for formatting
- Functional components with hooks
- Tailwind for styling

---

## 📞 Support

**Questions?**
- Technical: Check codebase docs first
- Auth Issues: Verify Clerk setup
- Database: Check Supabase console
- API Errors: Check environment variables

**Contact:**
- Email: annie@mooring.app
- GitHub: https://github.com/anniez-source/mooring_webapp

---

*Last updated: November 6, 2024*
*Version: 1.0*
*Author: AI + Annie*

