# Community Analytics - Setup & Usage Guide

## 🎯 What This Does

AI-powered thematic clustering that automatically identifies natural groups within your community based on:
- Domain/industry focus (climate tech, healthcare, AI, etc.)
- What members are building
- Expertise they offer
- What they're seeking (cofounders, mentorship, etc.)
- Experience level and stage

**Result:** Actionable intelligence about community composition, gaps, and opportunities.

---

## 📋 Setup Instructions

### Step 1: Create Database Table

Run this in Supabase SQL Editor:

```bash
create_community_themes_table.sql
```

This creates the `community_themes` table to store analysis results.

### Step 2: Files Created

✅ **Database:**
- `create_community_themes_table.sql`

✅ **API Routes:**
- `app/api/analytics/generate-themes/route.ts` - Generates new theme analysis
- `app/api/analytics/themes/route.ts` - Fetches latest analysis

✅ **Frontend:**
- `app/analytics/page.tsx` - Admin dashboard

---

## 🚀 How to Use

### Access the Dashboard

1. Navigate to: `http://localhost:3000/analytics`
2. You'll see the Community Intelligence dashboard

### Generate Themes (First Time)

1. Click **"Generate Community Themes"** button
2. System will:
   - Fetch all opted-in member profiles
   - Send to Claude API for analysis
   - Return 5-8 natural theme clusters
   - Store results in database
3. Wait ~10-30 seconds (depending on community size)

### View Results

The dashboard displays:

**Key Insights:**
- High-level observations about community composition
- Notable gaps or opportunities

**Theme Clusters:**
- **Name & Description** - What defines this cluster
- **Member Count** - How many people fit this theme
- **Common Backgrounds** - Shared experience patterns
- **Common Needs** - What they're seeking
- **Common Offerings** - What they can provide
- **Recommendation** - Actionable advice for community organizers
- **Member Names** - Expandable list of who's in this cluster

### Regenerate Themes

Click **"Regenerate Themes"** to run analysis again:
- Run weekly/monthly as community grows
- Run after onboarding new cohorts
- Run to see how themes evolve over time

---

## 📊 Example Output

```json
{
  "themes": [
    {
      "name": "AI/ML Infrastructure Builders",
      "description": "Technical founders building AI infrastructure and tooling",
      "member_count": 12,
      "member_names": ["Sarah Chen", "David Lee", ...],
      "common_backgrounds": [
        "Senior engineers from FAANG companies",
        "Previous ML infrastructure experience",
        "PhD in computer science or related fields"
      ],
      "common_needs": [
        "Business/GTM cofounders",
        "Introductions to potential customers",
        "Advice on enterprise sales"
      ],
      "common_offerings": [
        "Technical mentorship for engineers",
        "Domain expertise in ML systems",
        "Architecture design reviews"
      ],
      "recommendation": "Host a workshop on 'Technical founders building GTM muscle' and facilitate introductions to experienced sales leaders in this community."
    }
  ],
  "insights": [
    "High concentration of technical talent seeking business cofounders",
    "Notable gap: Few experienced go-to-market professionals",
    "Opportunity: Create structured programs to pair technical + business founders"
  ]
}
```

---

## 🔧 Technical Details

### How It Works

1. **Data Collection:**
   - Fetches all profiles where `opted_in = true`
   - Includes: background, expertise, looking_for, open_to
   - Filters by organization if specified

2. **AI Analysis:**
   - Sends profile data to Claude Sonnet 4.5
   - Uses advanced prompt to identify patterns
   - Returns structured JSON with themes + insights

3. **Storage:**
   - Saves to `community_themes` table
   - Includes: themes (JSONB), member_count, timestamp
   - Linked to organization for multi-tenancy

4. **Retrieval:**
   - Dashboard fetches most recent analysis
   - Can regenerate on-demand
   - Historical analyses preserved (ordered by timestamp)

### Organization Filtering

Currently set to analyze **all opted-in profiles** (org_id = null).

To enable org-specific analysis:
1. Populate `organization_members` table
2. Change `org_id: null` to actual org UUID in:
   - `/app/analytics/page.tsx` (both API calls)
3. System will automatically filter by that org

### Performance

- **Small communities (<50 members):** ~10 seconds
- **Medium communities (50-200 members):** ~20-30 seconds
- **Large communities (200+ members):** ~30-60 seconds

Claude API has high token limits, can handle 500+ profiles.

---

## 🎯 Use Cases

### For Community Managers:

1. **Onboarding New Cohorts:**
   - Identify natural peer groups
   - Facilitate intro sessions by theme
   - Spot gaps to recruit for

2. **Event Planning:**
   - Host workshops targeted at specific clusters
   - Create roundtables for similar founders
   - Invite speakers addressing common needs

3. **Matchmaking:**
   - See who's seeking what others offer
   - Create structured intro programs
   - Balance community composition

4. **Growth Strategy:**
   - Identify underrepresented areas
   - Recruit to fill gaps
   - Track how themes evolve

### For Reporting:

- Export insights for stakeholders
- Track community evolution over time
- Demonstrate program impact

---

## 🔐 Access Control

**Current:** Any authenticated user can access `/analytics`

**Recommended for Production:**
- Add admin role check in `app/analytics/page.tsx`
- Only allow community managers/admins
- Use Clerk organizations or custom admin flag

Example:
```typescript
// In analytics/page.tsx
const isAdmin = user?.publicMetadata?.role === 'admin';
if (!isAdmin) {
  return <div>Access denied</div>;
}
```

---

## 🔄 Automation Ideas

### Weekly Auto-Generation

Create a cron job or Vercel scheduled function:

```typescript
// app/api/analytics/scheduled-generation/route.ts
export async function GET() {
  // Run every Monday at 9am
  await fetch('/api/analytics/generate-themes', {
    method: 'POST',
    body: JSON.stringify({ org_id: null })
  });
  
  // Email results to admins
  // ...
}
```

### Email Digest

Send weekly email with:
- New themes identified
- Growth in each cluster
- Top recommendations

---

## 📈 Future Enhancements

1. **Trend Analysis:** Compare themes week-over-week
2. **Member Growth:** Track cluster size changes
3. **Recommendation Tracking:** Mark which recommendations were actioned
4. **Export:** Download themes as PDF/CSV
5. **Filters:** View themes by specific criteria
6. **Member Profiles:** Click member name → view their profile

---

## 🐛 Troubleshooting

### "No profiles found for analysis"
- Check that profiles have `opted_in = true`
- Verify profiles table has data
- Check organization filtering if enabled

### "Failed to generate themes"
- Verify `ANTHROPIC_API_KEY` is set
- Check Supabase connection
- Review API route logs

### Slow generation
- Normal for 100+ profiles
- Claude API processes ~1000 tokens/sec
- Consider pagination for 500+ members

### Empty themes returned
- Community too small (need 10+ members minimum)
- Profiles lack detail in background/expertise
- Try regenerating with updated profiles

---

## 💡 Tips

1. **Run after onboarding:** Let new members fill out profiles first
2. **Monthly cadence:** See how themes evolve
3. **Share with community:** Show members the themes (builds engagement)
4. **Act on recommendations:** Use insights to plan events/programs
5. **Export for reports:** Screenshot or PDF for stakeholders

---

## 🎉 You're All Set!

Go to `/analytics` and click "Generate Community Themes" to see your first analysis!

