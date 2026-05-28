#!/bin/bash
# ────────────────────────────────────────────────────────────────
#  PeaK Lead Hub — one-time setup script
#  Run from: ~/PeaK/PeaK/peak-lead-hub/
#  Mac Terminal: chmod +x setup.sh && ./setup.sh
# ────────────────────────────────────────────────────────────────

set -e

GITHUB_USER="priteshkabawala"
REPO_NAME="peak-lead-hub"

# Read token at runtime — never stored in the repo
if [ -z "$GITHUB_TOKEN" ]; then
  echo ""
  read -rsp "🔑  Paste your GitHub Personal Access Token (input hidden): " GITHUB_TOKEN
  echo ""
fi

echo ""
echo "🚀  PeaK Lead Hub — Deploy Setup"
echo "────────────────────────────────"

# 1. Create GitHub repo
echo ""
echo "1️⃣   Creating GitHub repo..."
curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"PeaK Lead Hub — LinkedIn Lead CRM\",\"private\":false,\"auto_init\":false}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('   ✅  Repo ready:', d.get('html_url', d.get('message','check GitHub')))"

# 2. Git init & first commit
echo ""
echo "2️⃣   Setting up git..."
git init -q
git branch -M main
git config user.email "priteshkabawala@gmail.com"
git config user.name "Pritesh Kabawala"
git add -A
git commit -q -m "feat: initial PeaK Lead Hub — Next.js + Supabase CRM"
echo "   ✅  Initial commit created"

# 3. Push to GitHub
echo ""
echo "3️⃣   Pushing to GitHub..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://$GITHUB_USER:$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git"
git push -u origin main -q
echo "   ✅  Code pushed → https://github.com/$GITHUB_USER/$REPO_NAME"

# 4. Install deps + Vercel CLI (if not already installed)
echo ""
echo "4️⃣   Installing dependencies..."
npm install -q 2>/dev/null && echo "   ✅  node_modules ready"

echo ""
echo "5️⃣   Deploying to Vercel..."
if ! command -v vercel &> /dev/null; then
  echo "   Installing Vercel CLI..."
  npm install -g vercel -q
fi

# Deploy — will prompt for login/team if first time
vercel deploy --prod \
  --name "peak-lead-hub" \
  --yes \
  -e NEXT_PUBLIC_SUPABASE_URL="https://trnjhjzardwhnpmaqulw.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRybmpoanphcmR3aG5wbWFxdWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODgwNDksImV4cCI6MjA5NTU2NDA0OX0.lCSEnfRe34WaYa_qaYy8nrLxeKbyDiMRBUw-9MgQga0"

echo ""
echo "────────────────────────────────────────────────────"
echo "✅  All done! Your CRM is live on Vercel."
echo "    GitHub:  https://github.com/$GITHUB_USER/$REPO_NAME"
echo "    Supabase: https://supabase.com/dashboard/project/trnjhjzardwhnpmaqulw"
echo ""
echo "💡  Future deployments: just run  git push  from this folder."
echo "    Vercel will auto-deploy on every push to main."
echo "────────────────────────────────────────────────────"
