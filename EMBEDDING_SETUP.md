# Contextual Similarity Matching with OpenAI Embeddings

## Overview

This system implements semantic similarity matching for profile search using OpenAI's text-embedding-3-small model. Profiles are embedded as vectors, and searches use contextual embeddings (combining the query with the searcher's profile) for more relevant results.

## Setup Instructions

### 1. Install Dependencies

Already installed:
- `openai` - OpenAI SDK
- `dotenv` - Environment variable loading

### 2. Configure Environment Variables

Add to your `.env.local` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Create Database Function

Run the SQL script in Supabase SQL Editor:

```bash
# Copy the contents of create_match_profiles_function.sql
# and run it in your Supabase SQL Editor
```

This creates the `match_profiles_contextual` function that performs similarity searches.

### 4. Generate Embeddings for Existing Profiles

Run the embedding generation script:

```bash
npm run embed-profiles
```

This will:
- Fetch all profiles from the database
- Generate embeddings for each profile's text content
- Store the embeddings in the `embedding` column
- Skip profiles with no content

**Note:** The script includes a 100ms delay between requests to avoid rate limiting.

## How It Works

### Profile Embedding

Each profile is embedded as a 1536-dimensional vector based on:
- Background (what's your story)
- Interests (what problems are you obsessed with)
- Expertise (what are you really good at)
- How they help (help offerings)

### Contextual Search

When a user searches, we create a contextual embedding that includes:
- The search query
- The searcher's background
- The searcher's expertise
- The searcher's interests

This allows the system to find people who are relevant not just to the query, but specifically relevant to the searcher.

### Automatic Embedding Generation

Embeddings are automatically generated when:
1. A user completes their profile (onboarding)
2. A user updates their profile (edit profile page)

The system calls `/api/generate-embedding` after each profile save.

## API Endpoints

### POST `/api/generate-embedding`

Generates and stores an embedding for a user's profile.

**Request:**
```json
{
  "userId": "uuid-of-user"
}
```

**Response:**
```json
{
  "success": true
}
```

### POST `/api/search-contextual`

Performs a contextual similarity search.

**Request:**
```json
{
  "query": "climate tech founders"
}
```

**Response:**
```json
{
  "matches": [
    {
      "user_id": "uuid",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "background": "...",
      "interests": "...",
      "expertise": "...",
      "how_i_help": ["advising", "coffee_chats"],
      "linkedin_url": "...",
      "profile_picture": "...",
      "similarity": 0.85,
      "similarity_percentage": 85
    }
  ]
}
```

## Integration with Chat

To integrate contextual search with your chat interface, you can:

1. **Option A: Replace current matching**
   - Modify `/app/api/chat/route.ts` to use contextual search
   - Replace the current Claude-based matching with embedding search
   - Use Claude only for formatting and explanation

2. **Option B: Hybrid approach**
   - Use embedding search to get top candidates
   - Pass those candidates to Claude for final ranking and explanation
   - Best of both worlds: fast similarity + smart reasoning

## Performance & Cost

**Embedding Generation:**
- Model: `text-embedding-3-small` (1536 dimensions)
- Cost: ~$0.00002 per 1K tokens (~$0.0001 per profile)
- Speed: ~100ms per profile

**Search:**
- Database vector search: <10ms for 1000 profiles
- Query embedding generation: ~100ms
- Total search time: ~110ms

**Scaling:**
- Embeddings are generated once and stored
- Searches are fast regardless of database size
- Only pay for embedding generation on profile updates

## Monitoring

Check if embeddings are working:

```sql
SELECT 
  COUNT(*) as total_profiles,
  COUNT(embedding) as profiles_with_embeddings
FROM profiles;
```

View similarity scores for a specific user:

```sql
SELECT 
  name,
  1 - (embedding <=> (SELECT embedding FROM profiles WHERE user_id = 'user-id-here')) as similarity
FROM profiles
WHERE embedding IS NOT NULL
ORDER BY similarity DESC
LIMIT 10;
```

## Troubleshooting

**Issue: "Function match_profiles_contextual does not exist"**
- Solution: Run the SQL script in `create_match_profiles_function.sql`

**Issue: "OPENAI_API_KEY is not set"**
- Solution: Add your OpenAI API key to `.env.local`

**Issue: Embeddings not generating**
- Check console logs for errors
- Verify OpenAI API key is valid
- Check that profile has content (not empty fields)

**Issue: Low similarity scores**
- Normal range: 0.6-0.95
- Below 0.6: Not very similar
- Above 0.8: Very similar
- Adjust `match_threshold` in search function if needed

## Next Steps

1. Get OpenAI API key
2. Add to `.env.local`
3. Run `create_match_profiles_function.sql` in Supabase
4. Run `npm run embed-profiles`
5. Test contextual search with `/api/search-contextual`
6. Integrate with your chat interface

## References

- OpenAI Embeddings Guide: https://platform.openai.com/docs/guides/embeddings
- Supabase Vector Guide: https://supabase.com/docs/guides/ai/vector-columns
- pgvector Documentation: https://github.com/pgvector/pgvector










