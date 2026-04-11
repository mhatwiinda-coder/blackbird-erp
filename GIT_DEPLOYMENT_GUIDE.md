# 🚀 Complete Git Deployment Guide

## What We'll Do
1. Initialize Git repository (if not already done)
2. Add all files to Git
3. Push to GitHub/GitLab
4. Connect to Netlify
5. Netlify auto-deploys every time you push

---

## Step 1: Check if Git is Initialized

```bash
cd "D:\mainza\BLACK BIRD"
git status
```

**If you see "fatal: not a git repository"** → Go to Step 2a  
**If you see branch info** → Go to Step 2b

---

## Step 2a: Initialize Git (First Time Only)

```bash
cd "D:\mainza\BLACK BIRD"

# Initialize Git
git init

# Add your name and email (use whatever, Netlify doesn't validate this)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Create initial commit
git add .
git commit -m "Initial commit: Netlify Functions + Supabase setup"
```

---

## Step 2b: If Git Already Initialized

Just continue to Step 3.

---

## Step 3: Add All Files to Git

```bash
cd "D:\mainza\BLACK BIRD"

# Add all new/modified files
git add .

# Check what's being added
git status

# Should show all the netlify/functions/*.js files and netlify.toml
```

---

## Step 4: Commit Changes

```bash
git commit -m "Add all Netlify Functions: auth, rent-to-own, driver-submissions, payments, drivers, logs, jobs, deliveries, invoices, quotations, dashboard"
```

**Output should show something like:**
```
 15 files changed, 2000+ insertions(+)
 create mode 100644 netlify.toml
 create mode 100644 netlify/functions/auth.js
 ...
```

---

## Step 5: Create GitHub Repository

### Option A: GitHub (Recommended)

1. **Go to:** https://github.com/new
2. **Create repository:**
   - Name: `blackbird-erp` (or whatever)
   - Description: `BLACKBIRD ERP System with Netlify Functions + Supabase`
   - Private or Public (your choice)
   - **DO NOT** initialize with README, .gitignore, or license
   - Click "Create repository"

3. **Copy the commands** shown (looks like below)

### Option B: GitLab

1. Go to: https://gitlab.com/projects/new
2. Create project with same settings
3. Copy the commands

---

## Step 6: Connect Local to GitHub

Run these commands (modify the URL with your GitHub URL):

```bash
cd "D:\mainza\BLACK BIRD"

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/blackbird-erp.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Output should show:**
```
Enumerating objects: 50, done.
Compressing objects: 100% (45/45), done.
Writing objects: 100% (50/50), 500.00 KiB | 250.00 KiB/s, done.
Total 50 (delta 0), reused 0 (delta 0)

* [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

✅ **Your code is now on GitHub!**

---

## Step 7: Deploy on Netlify

### Option A: Via Netlify Web UI (Easiest)

1. **Go to:** https://app.netlify.com (sign up if needed)
2. **Click:** "New site from Git"
3. **Select:** GitHub (or GitLab)
4. **Authorize** Netlify to access your GitHub account
5. **Select** your `blackbird-erp` repository
6. **Click:** "Deploy site"

**Netlify will:**
- ✅ Auto-detect `netlify.toml`
- ✅ Install dependencies
- ✅ Build functions
- ✅ Deploy in 1-2 minutes

### Option B: Via Netlify CLI (Pro Method)

```bash
# Install Netlify CLI (first time only)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Navigate to project
cd "D:\mainza\BLACK BIRD"

# Deploy
netlify deploy --prod
```

---

## Step 8: Add Environment Variables

**In Netlify Dashboard:**

1. **Go to:** Site Settings → Build & Deploy → Environment
2. **Click:** "Add environment variable"
3. **Add these variables:**

```
SUPABASE_URL = https://your-project.supabase.co
SUPABASE_KEY = your-anon-key-here
JWT_SECRET = your-secret-key-here
```

4. **Save**

---

## Step 9: Trigger Rebuild

Netlify auto-detects the environment variables but might need a rebuild:

**Option A: In Netlify Dashboard**
- Go to: Deploys → Trigger deploy → Deploy site

**Option B: Via Git Push**
```bash
git add .
git commit -m "Add environment variables (just to trigger rebuild)"
git push origin main
```

---

## Step 10: Verify Deployment ✅

1. **Check Functions Deployed:**
   - Netlify Dashboard → Functions
   - Should see: auth, rent-to-own, driver-submissions, payments, drivers, logs, jobs, deliveries, invoices, quotations, dashboard

2. **Test the Site:**
   - Click "Visit site" in Netlify Dashboard
   - URL will be like: `https://your-site.netlify.app`
   - Try logging in at `/erp`

3. **Test an API:**
   ```bash
   curl https://your-site.netlify.app/api/drivers
   ```

---

## Ongoing Workflow

### Every time you make changes:

```bash
cd "D:\mainza\BLACK BIRD"

# 1. Make your code changes

# 2. Stage changes
git add .

# 3. Commit
git commit -m "Your descriptive message here"

# 4. Push to GitHub
git push origin main
```

**Netlify automatically redeploys** after every push! ✅

---

## Creating Remaining Netlify Functions

Need to add staff.js, recruitment.js, mechanics.js, website-activity.js?

1. **Use the TEMPLATE.js** in `netlify/functions/`
2. **Copy and rename** to desired name
3. **Update** table names and fields
4. **Push to GitHub:**
   ```bash
   git add netlify/functions/staff.js
   git commit -m "Add staff Netlify Function"
   git push origin main
   ```
5. **Netlify auto-deploys** the new function!

---

## Troubleshooting

### "Authentication failed for repository"
→ Check your GitHub credentials  
→ Make sure SSH key or personal access token is set up

### "fatal: remote origin already exists"
→ You already have a remote, run:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/blackbird-erp.git
git push -u origin main
```

### Functions not showing in Netlify
→ Check netlify.toml exists in root
→ Redeploy manually in Netlify Dashboard
→ Check build logs for errors

### Deployment keeps failing
→ Check Netlify Logs → Builds → Click latest → View logs
→ Common issues: missing environment variables, package.json errors

### Want to undo a commit?
```bash
# Undo last commit (keeps changes)
git reset --soft HEAD~1

# Undo last commit (discards changes)
git reset --hard HEAD~1
```

---

## Useful Git Commands

```bash
# See commit history
git log --oneline

# See what changed
git diff

# Check status
git status

# Revert specific file to previous version
git checkout HEAD -- filename.js

# Delete a file and commit
git rm filename.js
git commit -m "Remove file"

# Create a new branch (useful for testing)
git checkout -b feature/new-function
```

---

## Git + Netlify Workflow Summary

```
Your Computer                GitHub                 Netlify
    ↓                          ↓                        ↓
  Write code    ----→    git push origin main   ----→ Auto-deploys
  git add .                  ↓                          ↓
  git commit             Stores your code       Rebuilds & redeploys
  git push                                      Functions working!
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Initialize Git | `git init` |
| Check status | `git status` |
| Add files | `git add .` |
| Commit | `git commit -m "message"` |
| Push to GitHub | `git push origin main` |
| View history | `git log --oneline` |
| Create branch | `git checkout -b branch-name` |
| Switch branch | `git checkout branch-name` |

---

## You're Ready! 🚀

Your app is now:
- ✅ Version controlled with Git
- ✅ Hosted on GitHub  
- ✅ Deployed on Netlify (auto-updates on push)
- ✅ Connected to Supabase database
- ✅ Using serverless Netlify Functions
- ✅ $0/month cost

**Every git push = automatic deployment** 🎉
