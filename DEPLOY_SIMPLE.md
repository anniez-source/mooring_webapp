# Deploy to Vercel - Run These Commands

## 1️⃣ Run this in your terminal:

```bash
cd /Users/annie/Documents/mooring_webapp
./deploy.sh
```

## 2️⃣ When it opens your browser:
- **Log in to Vercel** (with GitHub, email, or Google)
- The script will continue automatically after login

## 3️⃣ Add Environment Variables

After deployment, go to: [vercel.com/dashboard](https://vercel.com/dashboard)

Click your project → **Settings** → **Environment Variables**

Add these 7 variables (copy values from your `.env.local` file):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
```

**Important**: After adding variables, go to **Deployments** → Click the 3 dots → **Redeploy**

## 4️⃣ Update Clerk & Supabase

**Clerk**: Add your Vercel URL to authorized domains  
**Supabase**: Add your Vercel URL to redirect URLs

Done! 🎉

---

**Your app will be live at**: `https://your-app-name.vercel.app`

