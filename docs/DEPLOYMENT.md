# Deployment Guide

The Studio backend is a high-performance Python application integrated with Blender and Redis. This guide covers deploying to cloud providers.

## 1. Prerequisites
*   **Redis:** Required for the Celery task queue. Use Railway Redis, Heroku Data, or AWS ElastiCache.
*   **Blender:** Must be installed in the environment where the worker runs.

## 2. Environment Variables
| Key | Description |
|---|---|
| `REDIS_URL` | Connection string for Redis (e.g., `redis://localhost:6379/0`) |
| `ALLOWED_ORIGINS` | Comma-separated list of frontend domains |
| `SENTRY_DSN` | (Optional) Error tracking DSN |
| `DATABASE_URL` | Supabase/PostgreSQL connection string |
| `PYTHONPATH` | Should be set to `/app` (in Docker) |

## 3. Deployment to Railway (Recommended)
Railway handles the monorepo structure and Dockerfile automatically.

### Step 1: Connect GitHub
Link your repository to a new Railway project.

### Step 2: Configure Services
1.  **API Service:**
    *   Root Directory: `backend`
    *   Build Command: Handled by `Dockerfile`
    *   Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
2.  **Worker Service:**
    *   Root Directory: `backend`
    *   Start Command: `celery -A app.worker worker --loglevel=info`
3.  **Redis Service:**
    *   Add "Redis" from the Railway catalog.

## 4. Deployment to AWS ECS
Requires pushing the container to ECR.

### Multi-stage Build Optimization
The provided `backend/Dockerfile` uses multi-stage builds:
*   **Builder:** Compiles wheels for dependencies.
*   **Runtime:** installs `blender` via `apt-get` and copies the pre-built wheels.

### Resources
Render-heavy tasks require at least **2 vCPUs** and **4GB RAM** per worker instance to ensure Blender doesn't crash during boolean operations.

## 5. Deployment to Vercel (Frontend)
The frontend should be deployed separately to Vercel.
*   Framework: Next.js
*   Set `NEXT_PUBLIC_PYTHON_API_URL` to your Railway API URL.
