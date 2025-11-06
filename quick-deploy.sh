#!/bin/bash

# Quick deploy script - commits and pushes to GitHub (auto-triggers Vercel)

echo "🚀 Quick Deploy to GitHub + Vercel"
echo ""

# Check if commit message was provided
if [ -z "$1" ]; then
  echo "Usage: ./quick-deploy.sh \"Your commit message\""
  echo ""
  echo "Example: ./quick-deploy.sh \"Fixed bug in my-cluster page\""
  exit 1
fi

COMMIT_MSG="$1"

echo "📝 Adding all changes..."
git add -A

echo "💾 Committing with message: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo "🌐 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Vercel will auto-deploy in ~2 minutes"
echo "🔗 Watch deployment: https://vercel.com/anniez-source/mooring-webapp/deployments"
echo ""

