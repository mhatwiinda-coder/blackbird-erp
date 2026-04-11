# Netlify + Supabase Deployment Guide

## Setup Overview
- **Frontend:** Deployed on Netlify (static files from `public/`)
- **API:** Netlify Functions (serverless) in `netlify/functions/`
- **Database:** Supabase PostgreSQL

## Prerequisites

1. **Netlify Account** - Free at netlify.com
2. **Supabase Account** - Free at supabase.com
3. **Git Repository** - GitHub, GitLab, or Gitea

## Step 1: Prepare Supabase

1. Go to your Supabase project dashboard
2. Copy your **Project URL** and **Anon Key**
3. Go to Settings → API → Copy both values

## Step 2: Deploy to Netlify

### Option A: Via Git (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Setup Netlify Functions with Supabase"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to netlify.com → New site from Git
   - Select your repository
   - Netlify auto-detects `netlify.toml`
   - Click "Deploy site"

3. **Set Environment Variables:**
   - Netlify Dashboard → Site Settings → Build & Deploy → Environment
   - Add these variables:
     ```
     SUPABASE_URL = (your project URL)
     SUPABASE_KEY = (your anon key)
     JWT_SECRET = (something secure, e.g., openssl rand -base64 32)
     ```

4. **Trigger deploy:**
   - Push a commit to main or manually redeploy in Netlify dashboard

### Option B: Via Netlify CLI (Fastest)

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

4. **Add environment variables:**
   ```bash
   netlify env:set SUPABASE_URL "your-url"
   netlify env:set SUPABASE_KEY "your-key"
   netlify env:set JWT_SECRET "your-secret"
   ```

5. **Trigger rebuild:**
   ```bash
   netlify build
   netlify deploy --prod
   ```

## Step 3: Verify Deployment

1. **Check Functions:**
   - Netlify Dashboard → Functions
   - Should see: `auth`, `rent-to-own`, `driver-submissions`

2. **Test API:**
   ```bash
   curl https://your-site.netlify.app/api/rent-to-own
   ```

3. **Check Logs:**
   - Netlify Dashboard → Functions → Click function name → View logs

## Step 4: Update Frontend (If Needed)

The frontend API calls already use `/api/...` which automatically routes to Netlify Functions via the `netlify.toml` redirect rule. **No changes needed!**

## API Endpoints (All working on Netlify)

- **Auth:** `/api/auth/login`, `/api/auth/driver-login`
- **RTO:** `/api/rent-to-own/*`
- **Driver Submissions:** `/api/driver-submissions/*`
- **Payments:** `/api/payments/*` (coming soon)
- **Other endpoints:** Add more functions as needed

## Troubleshooting

### 404 on API calls
- Check Netlify Functions are deployed (Dashboard → Functions)
- Verify environment variables are set
- Check function logs for errors
- Clear browser cache

### "Invalid driver ID or password"
- Ensure Supabase tables exist: `drivers`, `driver_users`
- Verify JWT_SECRET is set in environment
- Check driver exists in `drivers` table

### Slow response times
- Netlify cold starts can take 1-2 seconds
- Normal after first request
- Cache is set to 1 hour for static files

### Database connection errors
- Check SUPABASE_URL and SUPABASE_KEY are correct
- Ensure your Supabase project is active (not frozen)
- Check Supabase dashboard for quota/billing issues

## File Structure

```
blackbird-erp/
├── public/                    # Frontend static files
│   ├── index.html
│   ├── erp.html
│   ├── driver.html
│   └── ...
├── netlify/
│   └── functions/             # Serverless API functions
│       ├── auth.js
│       ├── rent-to-own.js
│       ├── driver-submissions.js
│       └── ...
├── netlify.toml              # Netlify configuration
├── .env.example              # Environment variables template
└── package.json              # Dependencies
```

## Monitoring & Logs

1. **Netlify Function Logs:**
   - Dashboard → Functions → Click function → View logs

2. **Supabase Database Logs:**
   - Supabase Dashboard → Logs → Check for queries/errors

3. **Real-time Monitoring:**
   - Netlify Analytics → See request counts and response times

## Cost (All Free Tier)

- **Netlify:** 
  - 300 build minutes/month
  - Unlimited functions
  - 125,000 function invocations/month

- **Supabase:**
  - 500MB database
  - 1GB bandwidth
  - Unlimited API requests

Total: **$0/month** for small-to-medium usage!

## Next Steps

1. ✅ Deploy to Netlify
2. ✅ Test API endpoints
3. ✅ Add remaining route functions as needed
4. ✅ Set up Supabase backups
5. ✅ Configure custom domain (optional)

## Support

- Netlify Docs: https://docs.netlify.com/functions/overview/
- Supabase Docs: https://supabase.com/docs
- Error? Check the troubleshooting section or Netlify function logs!
