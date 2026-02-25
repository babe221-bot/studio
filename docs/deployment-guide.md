# Python Backend Deployment Guide

> **Target Platforms:** Render (primary) or Railway (alternative)  
> **Application Type:** FastAPI Python backend with PostgreSQL database  
> **Prerequisites:** Application has passed local validation

---

## Table of Contents

1. [Repository Preparation](#1-repository-preparation)
2. [Platform-Specific Configuration](#2-platform-specific-configuration)
3. [Retrieving the Live Deployment URL](#3-retrieving-the-live-deployment-url)
4. [Cross-Platform Integration (Vercel Dashboard)](#4-cross-platform-integration-vercel-dashboard)
5. [Post-Deployment Validation Checklist](#5-post-deployment-validation-checklist)

---

## 1. Repository Preparation

### 1.1 Verify `requirements.txt`

Ensure your [`backend/requirements.txt`](backend/requirements.txt) contains all necessary dependencies. The current file includes:

```txt
# Core
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
asyncpg==0.29.0
alembic==1.13.1

# Data Processing
pandas==2.2.0
numpy==1.26.3

# CAD Engine
ezdxf>=1.3.0
drawsvg>=2.3.0

# Imaging
pillow==10.2.0

# PDF Generation
reportlab==4.0.8
weasyprint==60.1

# Config
python-dotenv==1.0.1
pydantic==2.5.3
pydantic-settings==2.1.0
httpx==0.26.0
```

> ⚠️ **Note for Render:** WeasyPrint requires system-level dependencies. Add a build script or use a Render native environment.

### 1.2 Create `runtime.txt`

Create a `backend/runtime.txt` file to specify the Python version:

```txt
3.11.7
```

**Why this matters:** Both Render and Railway use this file to determine which Python runtime to install. Without it, you may get an older or mismatched Python version.

### 1.3 Create `render.yaml` (Render Blueprint)

Create a `render.yaml` file in the **repository root** for Infrastructure-as-Code deployment:

```yaml
services:
  - type: web
    name: studio-python-api
    env: python
    region: oregon # or frankfurt for EU
    plan: starter # free tier available
    buildCommand: pip install -r backend/requirements.txt
    startCommand: cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.7
      - key: DATABASE_URL
        fromDatabase:
          name: studio-db
          property: connectionString
      - key: DB_ECHO
        value: false

databases:
  - name: studio-db
    region: oregon
    plan: starter # free tier available
```

### 1.4 Alternative: Update `railway.json`

The existing [`railway.json`](railway.json) is already configured:

```json
{
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
        "builder": "NIXPACKS",
        "watchPatterns": [
            "/backend/**",
            "/stone_slab_cad/**"
        ]
    },
    "deploy": {
        "startCommand": "cd backend && pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port $PORT",
        "restartPolicyType": "ON_FAILURE",
        "restartPolicyMaxRetries": 10
    }
}
```

### 1.5 Create `backend/build.sh` (for WeasyPrint dependencies)

If using WeasyPrint, create a build script for system dependencies:

```bash
#!/usr/bin/env bash
# backend/build.sh
set -e

# Install system dependencies for WeasyPrint
apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info

# Install Python dependencies
pip install -r requirements.txt
```

### 1.6 Update CORS Configuration

Update [`backend/app/main.py`](backend/app/main.py:24) to allow your Vercel frontend domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-project.vercel.app",  # Replace with your Vercel URL
        "https://your-custom-domain.com",   # Optional custom domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Better approach - Use environment variable:**

```python
import os

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 2. Platform-Specific Configuration

### 2A. Render Deployment (Recommended)

#### Step 1: Create Render Account

1. Navigate to [render.com](https://render.com)
2. Sign up using your GitHub account for seamless integration
3. Verify your email address

#### Step 2: Create PostgreSQL Database

1. In Render Dashboard, click **New +** → **PostgreSQL**
2. Configure the database:
   - **Name:** `studio-db`
   - **Region:** Choose closest to your users (Oregon, Frankfurt, Singapore, etc.)
   - **PostgreSQL Version:** 15 (or latest)
   - **Plan:** Starter (free) or Standard ($7/month)
3. Click **Create Database**
4. **Important:** Copy the **Internal Database URL** for later use

#### Step 3: Create Web Service

**Option A: Using Blueprint (render.yaml)**

1. Push your `render.yaml` to your repository root
2. In Render Dashboard, click **New +** → **Blueprint**
3. Connect your GitHub repository
4. Render will detect the `render.yaml` and create all services
5. Review and click **Apply**

**Option B: Manual Configuration**

1. In Render Dashboard, click **New +** → **Web Service**
2. Connect your GitHub repository
3. Configure the service:
   - **Name:** `studio-python-api`
   - **Region:** Same as your database
   - **Branch:** `main` (or your deployment branch)
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** 
     ```bash
     pip install -r requirements.txt
     ```
   - **Start Command:**
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Plan:** Starter (free) or Standard ($7/month)

#### Step 4: Configure Environment Variables

In the Web Service settings, add these environment variables:

| Key | Value | Source |
|-----|-------|--------|
| `DATABASE_URL` | (auto-filled from database) | Select from linked database |
| `DB_ECHO` | `false` | Manual |
| `ALLOWED_ORIGINS` | `https://your-project.vercel.app` | Manual (comma-separated for multiple) |
| `PYTHON_VERSION` | `3.11.7` | Manual |

**To link database:**
1. Go to your Web Service → **Environment** tab
2. Click **Add Environment Variable**
3. Select **Database** as the source
4. Choose your `studio-db` database
5. Select `DATABASE_URL` property

#### Step 5: Deploy

1. Click **Create Web Service** (manual) or **Apply** (blueprint)
2. Render will begin building your application
3. Monitor the logs for any build errors
4. Initial deployment typically takes 3-5 minutes

---

### 2B. Railway Deployment (Alternative)

#### Step 1: Create Railway Account

1. Navigate to [railway.app](https://railway.app)
2. Sign up using your GitHub account
3. Verify your email and complete onboarding

#### Step 2: Create New Project

1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Authorize Railway to access your repositories
4. Select your repository

#### Step 3: Add PostgreSQL Database

1. In your project, click **Add Service**
2. Select **Database** → **PostgreSQL**
3. Railway will auto-provision and set `DATABASE_URL`

#### Step 4: Configure Web Service

Railway will auto-detect Python from your `requirements.txt`. Verify settings:

1. Click on your web service
2. Go to **Settings** tab
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

#### Step 5: Set Environment Variables

1. Go to **Variables** tab
2. Add variables:

| Variable Name | Value |
|---------------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference) |
| `ALLOWED_ORIGINS` | `https://your-project.vercel.app` |
| `DB_ECHO` | `false` |

#### Step 6: Deploy

1. Click **Deploy** or push to your connected branch
2. Monitor deployment logs
3. Railway provides a public URL automatically

---

## 3. Retrieving the Live Deployment URL

### 3A. Render URL

1. Navigate to your Web Service in Render Dashboard
2. The URL is displayed at the top of the service page
3. Format: `https://studio-python-api.onrender.com`
4. **Copy this URL** for Vercel configuration

**Custom Domain (Optional):**
1. Go to **Settings** → **Custom Domains**
2. Click **Add Custom Domain**
3. Follow DNS configuration instructions

### 3B. Railway URL

1. Navigate to your web service in Railway Dashboard
2. Go to **Settings** → **Networking**
3. Click **Generate Domain** or add custom domain
4. Format: `https://your-app.up.railway.app`
5. **Copy this URL** for Vercel configuration

### 3C. Verify URL is Working

Test your deployment with these endpoints:

```bash
# Root endpoint
curl https://your-api-url.onrender.com/

# Expected response:
# {"message": "Studio Python API", "status": "running"}

# Health check
curl https://your-api-url.onrender.com/health

# Expected response:
# {"status": "healthy"}
```

---

## 4. Cross-Platform Integration (Vercel Dashboard)

This section details how to connect your Vercel frontend with the deployed Python backend.

### 4.1 Access Vercel Dashboard

1. Navigate to [vercel.com](https://vercel.com)
2. Sign in to your account
3. Select your **Studio** project from the dashboard

### 4.2 Navigate to Environment Variables

1. In your project dashboard, click the **Settings** tab at the top
2. In the left sidebar, click **Environment Variables**
3. You will see a list of existing variables

### 4.3 Configure `PYTHON_API_URL`

This variable tells your Next.js frontend where to send API requests.

**Steps:**

1. Click **Add** or **Edit** on the `NEXT_PUBLIC_PYTHON_API_URL` variable
2. Enter the following values:

| Field | Value |
|-------|-------|
| **Key** | `NEXT_PUBLIC_PYTHON_API_URL` |
| **Value** | `https://your-api-url.onrender.com` (or Railway URL) |
| **Environment** | Select all: Production, Preview, Development |

3. Click **Save**

> **Note:** The `NEXT_PUBLIC_` prefix makes this variable accessible in the browser. Without it, the variable is only available server-side.

### 4.4 Configure `DATABASE_URL` (If Needed)

If your frontend needs direct database access (e.g., for Supabase):

1. Click **Add** to create a new variable
2. Enter:

| Field | Value |
|-------|-------|
| **Key** | `DATABASE_URL` |
| **Value** | Your Supabase PostgreSQL connection string |
| **Environment** | Production (and others as needed) |

**Supabase Connection String Format:**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**Where to find it:**
1. Go to [supabase.com](https://supabase.com) dashboard
2. Select your project
3. Navigate to **Project Settings** → **Database**
4. Copy the **Connection string** (URI format)
5. Replace `[password]` with your database password

### 4.5 Configure Additional Variables

Based on your [`vercel.json`](vercel.json), ensure these are set:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase Dashboard → Settings → API |
| `OPENAI_API_KEY` | OpenAI API key | [platform.openai.com](https://platform.openai.com) |

### 4.6 Trigger Redeployment

After updating environment variables, redeploy for changes to take effect:

1. Go to **Deployments** tab
2. Find the most recent deployment
3. Click the **...** (three dots) menu
4. Select **Redeploy**
5. Confirm the redeployment

**Alternative - Automatic:**
- Push a new commit to trigger automatic deployment
- Environment variables are injected at build time for `NEXT_PUBLIC_*` vars

### 4.7 Verify Environment Variables in Code

Ensure your frontend code uses the environment variable correctly:

```typescript
// Example usage in frontend code
const pythonApiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000';

// API call example
const response = await fetch(`${pythonApiUrl}/api/cad/generate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

---

## 5. Post-Deployment Validation Checklist

### 5.1 Backend Health Checks

- [ ] **Root endpoint responds**
  ```bash
  curl https://your-api-url.onrender.com/
  # Expected: {"message": "Studio Python API", "status": "running"}
  ```

- [ ] **Health check endpoint responds**
  ```bash
  curl https://your-api-url.onrender.com/health
  # Expected: {"status": "healthy"}
  ```

- [ ] **API documentation accessible** (if enabled)
  ```bash
  # Open in browser:
  https://your-api-url.onrender.com/docs
  ```

- [ ] **Database connection works**
  - Check Render/Railway logs for successful database initialization
  - Look for: `Database initialized successfully` or similar

### 5.2 Frontend-Backend Communication

- [ ] **CORS is configured correctly**
  - Open browser DevTools (F12)
  - Navigate to your Vercel frontend
  - Check Console for CORS errors
  - Should see no red CORS-related errors

- [ ] **API calls succeed from frontend**
  - Open browser DevTools → Network tab
  - Perform an action that triggers an API call
  - Verify requests to Python backend return 200 status

- [ ] **Environment variable is accessible**
  - Open browser DevTools → Console
  - Type: `console.log(process.env.NEXT_PUBLIC_PYTHON_API_URL)`
  - Should display your backend URL

### 5.3 Database Connectivity

- [ ] **Database migrations ran successfully**
  - Check deployment logs for migration output
  - Verify tables exist in database

- [ ] **CRUD operations work**
  - Test creating a record via API
  - Test reading records
  - Test updating records
  - Test deleting records

### 5.4 Security Verification

- [ ] **Environment variables are not exposed**
  - Check that sensitive keys are not in client-side bundle
  - Verify `NEXT_PUBLIC_` prefix is only used for safe variables

- [ ] **CORS allows only intended origins**
  - Verify your production domain is in allowed origins
  - Verify `localhost` is NOT in production CORS (or remove after testing)

- [ ] **Database credentials are secure**
  - Never commit `.env` files
  - Use platform environment variable features

### 5.5 Performance Checks

- [ ] **Cold start time is acceptable**
  - First request after deployment may be slow (30-60 seconds on free tier)
  - Subsequent requests should be fast (< 500ms)

- [ ] **API response times are reasonable**
  ```bash
  # Measure response time
  curl -w "@curl-format.txt" -o /dev/null -s https://your-api-url.onrender.com/health
  ```

- [ ] **No memory leaks**
  - Monitor memory usage in Render/Railway dashboard
  - Should remain stable under normal load

### 5.6 Monitoring Setup

- [ ] **Enable logging**
  - Render: Logs are available in the Logs tab
  - Railway: Logs available in the Deployments view

- [ ] **Set up alerts** (optional but recommended)
  - Render: Configure alerts in Settings → Notifications
  - Railway: Use integrations for Slack/Discord notifications

- [ ] **Monitor uptime**
  - Consider using UptimeRobot or similar service
  - Set up health check pings every 5 minutes

### 5.7 Final Integration Test

Run this complete test flow:

```bash
# 1. Test backend health
curl https://your-api-url.onrender.com/health

# 2. Test CAD endpoint (example)
curl -X POST https://your-api-url.onrender.com/api/cad/generate \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# 3. Test from frontend
# Open your Vercel URL and perform a full user flow
```

---

## Troubleshooting Common Issues

### Build Fails: WeasyPrint Dependencies

**Problem:** WeasyPrint requires system libraries not available in default environment.

**Solution for Render:**
1. Use a Docker environment instead of native Python
2. Create a `Dockerfile` in the backend directory:

```dockerfile
FROM python:3.11-slim

# Install WeasyPrint dependencies
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Database Connection Fails

**Problem:** `DATABASE_URL` not properly configured or SSL issues.

**Solution:**
1. Verify `DATABASE_URL` environment variable is set
2. For Supabase, ensure you're using the correct connection string format
3. Add `?sslmode=require` to the connection string if needed

### CORS Errors

**Problem:** Frontend cannot make requests to backend.

**Solution:**
1. Verify `ALLOWED_ORIGINS` includes your Vercel URL
2. Check that the URL has no trailing slash
3. Ensure `allow_credentials=True` is set if using cookies

### Cold Start Timeout

**Problem:** First request times out on free tier.

**Solution:**
1. Upgrade to a paid plan for always-on service
2. Use a cron job to ping the service every 5 minutes
3. Implement request retry logic in the frontend

---

## Quick Reference Commands

```bash
# Local testing
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Test production endpoints
curl https://your-api-url.onrender.com/
curl https://your-api-url.onrender.com/health
curl https://your-api-url.onrender.com/docs

# View logs (Render CLI)
render logs studio-python-api --tail

# View logs (Railway CLI)
railway logs
```

---

## Support Resources

- **Render Documentation:** [render.com/docs](https://render.com/docs)
- **Railway Documentation:** [docs.railway.app](https://docs.railway.app)
- **Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)
- **FastAPI Documentation:** [fastapi.tiangolo.com](https://fastapi.tiangolo.com)
- **Supabase Documentation:** [supabase.com/docs](https://supabase.com/docs)

---

*Last updated: February 2026*
