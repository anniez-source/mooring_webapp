# 🚀 Deployment Guide - Mooring Web App

This guide will help you deploy your AI-powered clustering platform to Vercel.

---

## 📋 Prerequisites

Before deploying, ensure you have:

1. ✅ **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. ✅ **GitHub Repository**: Your code should be pushed to GitHub
3. ✅ **Environment Variables**: All API keys ready (see below)
4. ✅ **Supabase Database**: Your database is set up with all tables and embeddings

---

## 🔑 Required Environment Variables

You'll need to configure these in Vercel:

### Supabase (Database)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # For server-side operations
```

### Clerk (Authentication)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### AI Services
```bash
ANTHROPIC_API_KEY=sk-ant-...  # For Claude (chat/matching)
OPENAI_API_KEY=sk-...         # For embeddings (search/clustering)
```

---

## 🎯 Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Go to [vercel.com/new](https://vercel.com/new)**

3. **Import your GitHub repository**:
   - Click "Add New Project"
   - Select your `mooring_webapp` repository
   - Click "Import"

4. **Configure your project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

5. **Add Environment Variables**:
   - Click "Environment Variables"
   - Add all 7 variables from the list above
   - For each variable:
     - Enter the key (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
     - Enter the value
     - Check all environments (Production, Preview, Development)

6. **Click "Deploy"**:
   - Vercel will build and deploy your app (~2-3 minutes)
   - You'll get a URL like `https://mooring-webapp.vercel.app`

---

### Option 2: Deploy via Vercel CLI (Advanced)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from your project directory**:
   ```bash
   cd /Users/annie/Documents/mooring_webapp
   vercel
   ```

4. **Follow the prompts**:
   - Link to existing project or create new
   - Set up environment variables when prompted

5. **Deploy to production**:
   ```bash
   vercel --prod
   ```

---

## ⚙️ Post-Deployment Configuration

### 1. Update Clerk Allowed Origins

Go to your [Clerk Dashboard](https://dashboard.clerk.com):
- Navigate to **Domains** (or **Settings → Domains**)
- Add your Vercel domain:
  - `https://your-app-name.vercel.app`
- Add to **Allowed Origins** and **Redirect URLs**

### 2. Update Supabase CORS Settings

Go to your [Supabase Dashboard](https://supabase.com/dashboard):
- Navigate to **Settings → API**
- Under **CORS Configuration**, add:
  - `https://your-app-name.vercel.app`
  - `https://*.vercel.app` (for preview deployments)

### 3. Set Custom Domain (Optional)

In Vercel:
- Go to **Settings → Domains**
- Add your custom domain (e.g., `mooring.app`)
- Update DNS records as instructed
- Vercel automatically provisions SSL certificates

---

## 🔄 Continuous Deployment

After initial setup, every `git push` to your main branch will:
1. Automatically trigger a new deployment
2. Run build checks
3. Deploy to production if successful
4. Preview deployments for pull requests

---

## 🧪 Testing Your Deployment

1. **Visit your Vercel URL**
2. **Test authentication**:
   - Sign up / Sign in with Clerk
3. **Test search**:
   - Navigate to `/chat`
   - Search for people
   - Check if embeddings and Claude are working
4. **Test communities**:
   - Navigate to `/communities`
   - Verify clusters are visible
5. **Check behavior tracking**:
   - Perform a search
   - Save a contact
   - Check Supabase `user_behavior` table for updates

---

## 🐛 Troubleshooting

### Build Fails

**Error**: `Module not found`
- **Fix**: Ensure all dependencies are in `package.json`
- Run `npm install` locally and commit `package-lock.json`

**Error**: `Environment variable not found`
- **Fix**: Double-check all 7 env variables are set in Vercel
- Variables must be available in all environments

### Runtime Errors

**Error**: `CORS policy` errors
- **Fix**: Add Vercel domain to Clerk and Supabase allowed origins

**Error**: `Cannot connect to Supabase`
- **Fix**: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct (must start with `https://`)

**Error**: `Clerk authentication failed`
- **Fix**: Ensure Clerk domain settings include your Vercel URL

### Performance Issues

**Slow page loads**:
- Vercel automatically caches static assets
- Consider adding ISR (Incremental Static Regeneration) for `/communities`

**API timeouts**:
- Vercel Hobby plan has 10s timeout for serverless functions
- Upgrade to Pro for 60s timeout if needed

---

## 📊 Monitoring & Analytics

### Vercel Analytics (Built-in)
- Go to your project → **Analytics**
- Track:
  - Page views
  - API response times
  - Error rates

### Custom Monitoring
- Add error tracking: [Sentry](https://sentry.io)
- Add analytics: [PostHog](https://posthog.com), [Plausible](https://plausible.io)

---

## 💰 Cost Estimates

### Vercel
- **Hobby (Free)**: $0/month
  - Unlimited deployments
  - 100GB bandwidth
  - Serverless functions (10s timeout)
  - Perfect for MVP!

- **Pro**: $20/month (if needed)
  - 1TB bandwidth
  - 60s function timeout
  - Team collaboration

### Other Services (Already Using)
- **Supabase**: ~$25/month (Pro plan for pgvector)
- **Clerk**: $25/month (Pro plan)
- **OpenAI**: ~$5-20/month (usage-based)
- **Anthropic**: ~$10-30/month (usage-based)

**Total**: ~$65-120/month (most goes to infrastructure, not Vercel)

---

## 🚦 Deployment Checklist

Before going live:

- [ ] All environment variables configured in Vercel
- [ ] Clerk domains updated with Vercel URL
- [ ] Supabase CORS configured for Vercel domain
- [ ] Database has embeddings generated (run `npm run embed-profiles`)
- [ ] Clusters detected (run `npm run detect-clusters`)
- [ ] Test authentication flow
- [ ] Test search functionality
- [ ] Test communities page
- [ ] Test behavior tracking
- [ ] Custom domain configured (optional)
- [ ] Error monitoring set up (optional)

---

## 🎉 You're Live!

Once deployed, your AI-powered community platform will be accessible at:
- **Production**: `https://your-app-name.vercel.app`
- **Preview**: `https://your-app-name-git-branch.vercel.app` (for each PR)

Share your URL and start connecting your community! 🚀

---

## 📞 Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Vercel Support**: https://vercel.com/support

