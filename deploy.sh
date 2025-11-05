#!/bin/bash

echo "🚀 Deploying Mooring Web App to Vercel..."
echo ""
echo "Step 1: Vercel Login"
echo "--------------------"
vercel login

echo ""
echo "Step 2: Deploy to Production"
echo "-----------------------------"
cd /Users/annie/Documents/mooring_webapp
vercel --prod

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "⚠️  IMPORTANT: After deployment, you need to:"
echo "1. Add environment variables in Vercel dashboard"
echo "2. Update Clerk authorized domains"
echo "3. Update Supabase redirect URLs"
echo ""
echo "See DEPLOY_NOW.md for detailed instructions."

