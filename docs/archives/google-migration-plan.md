# Google Backend Removal & Migration Plan

## Executive Summary

This document outlines a comprehensive plan to completely remove all Google backend services from the studio repository and replace them with alternative open-source or cloud-agnostic solutions. The migration covers Firebase (authentication, storage), Google AI/Genkit (AI/ML), Google Cloud BigQuery (data warehouse), and Google Cloud Storage (file storage).

**Key Addition**: This plan also introduces Python as a backend language to complement the Next.js frontend, leveraging your existing `stone_slab_cad/` Python infrastructure for CAD processing and advanced computations.

---

## Phase 1: Current State Analysis

### 1.1 Google Services Currently In Use

| Service | Purpose | Files Affected | Package Version |
|---------|---------|----------------|-----------------|
| **Firebase** | Authentication, Firestore, Hosting | `src/lib/firebase.ts`, `serviceAccountKey.json`, `apphosting.yaml` | firebase ^11.10.0 |
| **Google AI/Genkit** | AI image generation, technical drawings | `src/ai/genkit.ts`, `src/ai/flows/imageGenerationFlow.ts` | genkit ^1.13.0, @genkit-ai/googleai ^1.13.0 |
| **BigQuery** | Data warehouse, analytics | `src/services/warehouseService.ts` | @google-cloud/bigquery ^7.8.0 |
| **Cloud Storage** | Image file storage | `src/ai/flows/imageGenerationFlow.ts` | @google-cloud/storage ^7.11.0 |
| **App Hosting** | Deployment | `apphosting.yaml` | N/A |
| **googleapis** | General API client | Dependencies | googleapis ^140.0.1 |

### 1.2 Project Configuration Details

- **Firebase Project ID**: `stone-c4507`
- **Cloud Storage Bucket**: `radninalog`
- **AI Model**: `googleai/gemini-2.0-flash`

### 1.3 Existing Python Infrastructure

Your repository already contains Python code in `stone_slab_cad/`:
- `cad_pipeline.py` - CAD processing pipeline
- `slab2d.py`, `slab3d.py` - 2D/3D slab modeling
- `web_preview.py` - Web preview server
- `requirements.txt` - Python dependencies

This existing Python codebase will be leveraged for the new backend architecture.

---

## Phase 2: Migration Strategy by Service

### 2.1 Firebase → Supabase (Recommended)

**Why Supabase:**
- Open-source Firebase alternative
- PostgreSQL-based with REST/Realtime APIs
- Built-in Authentication, Storage, and Edge Functions
- Excellent TypeScript support
- Free tier suitable for development

**Migration Steps:**
1. Replace `firebase` package with `@supabase/supabase-js`
2. Update authentication logic in `src/lib/firebase.ts`
3. Migrate Firestore data to PostgreSQL tables
4. Replace Firebase Storage with Supabase Storage buckets
5. Update `serviceAccountKey.json` → Supabase service role key
6. Deploy edge functions to Supabase or replace with Next.js API routes

**File Changes:**
```typescript
// Before (Firebase)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// After (Supabase)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```

---

### 2.2 Google AI/Genkit → OpenAI + Vercel AI SDK (Recommended)

**Why Vercel AI SDK:**
- Framework-agnostic AI interface
- Supports multiple providers (OpenAI, Anthropic, Cohere, Ollama)
- Server Actions integration with Next.js
- Streaming responses built-in
- Works with your Python backend for complex AI tasks

**Alternative Options:**
- **Ollama** (local/self-hosted) - For complete privacy
- **Anthropic Claude** - For different AI capabilities
- **OpenRouter** - Unified API for multiple models
- **Python Backend** - For CAD-specific AI processing

**Migration Steps:**
1. Remove `genkit`, `@genkit-ai/googleai`, `@genkit-ai/next`
2. Install `ai` (Vercel AI SDK) and `@ai-sdk/openai`
3. Rewrite `src/ai/genkit.ts` to use AI SDK
4. Update image generation flow in `src/ai/flows/imageGenerationFlow.ts`
5. Replace Gemini model calls with OpenAI DALL-E or GPT-4 Vision
6. Remove Google Cloud Storage dependencies for AI outputs
7. Integrate Python backend for CAD-specific AI processing

**File Changes:**
```typescript
// Before (Genkit)
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

// After (AI SDK)
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
const model = openai('gpt-4o');
```

---

### 2.3 BigQuery → PostgreSQL + Supabase (Recommended)

**Why PostgreSQL/Supabase:**
- Supabase provides managed PostgreSQL
- SQL compatibility with existing BigQuery queries
- Lower cost for typical query volumes
- Real-time subscriptions
- Row Level Security (RLS)

**Alternative: Neon** - Serverless PostgreSQL with branching capabilities

**Migration Steps:**
1. Export BigQuery schemas and data
2. Import data into Supabase PostgreSQL
3. Rewrite queries in `src/services/warehouseService.ts` to use Supabase client
4. Update connection pooling configuration
5. Consider using Prisma or Drizzle ORM for type safety

**File Changes:**
```typescript
// Before (BigQuery)
import { BigQuery } from '@google-cloud/bigquery';
const bigqueryClient = new BigQuery({ projectId: 'stone-c4507' });
const [rows] = await bigqueryClient.query({ query });

// After (PostgreSQL/Supabase)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);
const { data, error } = await supabase.from('table').select('*');
```

---

### 2.4 Cloud Storage → Supabase Storage

**Migration Steps:**
1. Create new storage buckets in Supabase
2. Migrate existing images from `radninalog` bucket
3. Update upload logic in `src/ai/flows/imageGenerationFlow.ts`
4. Update public URL generation
5. Remove `@google-cloud/storage` dependency

---

### 2.5 App Hosting → Vercel / Netlify / Local

**See Phase 5 for detailed deployment instructions**

---

## Phase 3: Python Backend Integration

### 3.1 Why Add Python Backend?

Your repository already contains Python CAD code in `stone_slab_cad/`. Integrating Python as a backend provides:

1. **CAD Processing**: Leverage existing `slab2d.py`, `slab3d.py` for technical drawings
2. **Data Processing**: Complex calculations, batch processing
3. **AI/ML**: PyTorch, TensorFlow for custom ML models
4. **PDF Generation**: Use existing `pdf.ts` logic with Python alternatives
5. **Database Operations**: Direct PostgreSQL access for complex queries

### 3.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│                   http://localhost:3000                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ API Routes / Server Actions
┌─────────────────────────▼───────────────────────────────────┐
│                    API Layer (Next.js)                        │
│         /api/python/*  →  Proxies to Python Backend          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────▼───────────────────────────────────┐
│                   Python Backend (FastAPI)                   │
│                   http://localhost:8000                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ CAD Pipeline │  │ AI/ML Models│  │ Data Processing     │ │
│  │ slab2d/slab3d│  │ PyTorch      │  │ SQL/Pandas          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    Supabase (PostgreSQL)                     │
│              Storage, Auth, Database                          │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Python Backend Setup

#### Step 1: Create Python Backend Structure

```
studio/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── cad.py           # CAD processing endpoints
│   │   │   └── data.py          # Data processing endpoints
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── schemas.py       # Pydantic models
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── cad_service.py   # CAD processing logic
│   │       └── database.py       # PostgreSQL connection
│   ├── requirements.txt
│   ├── .env.example
│   └── uvicorn.conf.py
```

#### Step 2: Python Dependencies (requirements.txt)

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

# AI/ML (optional)
torch==2.1.2
transformers==4.36.2
pillow==10.2.0

# PDF Generation
reportlab==4.0.8
weasyprint==60.1

# CORS
python-cors==1.0.0
pydantic==2.5.3
pydantic-settings==2.1.0
httpx==0.26.0
```

#### Step 3: FastAPI Main Application (backend/app/main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.api import cad, data
from app.services.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Studio API",
    description="Python backend for CAD processing and data operations",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cad.router, prefix="/api/cad", tags=["CAD"])
app.include_router(data.router, prefix="/api/data", tags=["Data"])

@app.get("/")
async def root():
    return {"message": "Studio Python API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

#### Step 4: CAD Processing Endpoints (backend/app/api/cad.py)

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import CADResponse, ProcessingRequest
from app.services import cad_service
import os

router = APIRouter()

@router.post("/generate-drawing", response_model=CADResponse)
async def generate_technical_drawing(request: ProcessingRequest):
    """
    Generate technical drawing using CAD pipeline
    """
    try:
        result = await cad_service.generate_drawing(
            dimensions=request.dimensions,
            material=request.material,
            style=request.style
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-slab")
async def process_slab(file: UploadFile = File(...)):
    """
    Process uploaded slab design file
    """
    contents = await file.read()
    
    # Save temporary file
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(contents)
    
    try:
        result = await cad_service.process_slab_file(temp_path)
        return result
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("/materials")
async def list_materials():
    """Get available materials"""
    return await cad_service.get_materials()
```

#### Step 5: Database Service (backend/app/services/database.py)

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://user:password@localhost:5432/studio"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=True,
    poolclass=NullPool,  # For serverless
    future=True
)

AsyncSessionLocal = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

Base = declarative_base()

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

### 3.4 Frontend Integration with Python Backend

#### Step 1: Create API Proxy Routes

```typescript
// src/app/api/cad/generate-drawing/route.ts
import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${PYTHON_API_URL}/api/cad/generate-drawing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Python API error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('CAD generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate drawing' },
      { status: 500 }
    );
  }
}
```

#### Step 2: Use in Frontend Component

```typescript
// src/components/Lab.tsx (example usage)
async function generateDrawing(dimensions: Dimensions) {
  const response = await fetch('/api/cad/generate-drawing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dimensions,
      material: 'granite',
      style: 'technical'
    })
  });
  
  return await response.json();
}
```

### 3.5 Running Python Backend Locally

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your database URL

# Run development server
uvicorn app.main:app --reload --port 8000

# Python API will be available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

---

## Phase 4: Implementation Roadmap

### Sprint 1: Foundation & Core Setup
- [ ] Create Supabase project and configure environment
- [ ] Set up PostgreSQL database schema
- [ ] Configure Supabase Auth and Storage
- [ ] Install new dependencies (`@supabase/supabase-js`, `ai`, `@ai-sdk/openai`)
- [ ] Set up Vercel project
- [ ] Create Python backend structure
- [ ] Set up Python virtual environment

### Sprint 2: Data & Storage Migration
- [ ] Export BigQuery data to CSV/JSON
- [ ] Import data into Supabase PostgreSQL
- [ ] Migrate Cloud Storage images to Supabase Storage
- [ ] Update `src/services/warehouseService.ts`
- [ ] Update `src/ai/flows/imageGenerationFlow.ts`
- [ ] Connect Python backend to PostgreSQL

### Sprint 3: Authentication & AI
- [ ] Replace Firebase auth with Supabase Auth
- [ ] Update `src/lib/firebase.ts` → Supabase client
- [ ] Rewrite AI flows with Vercel AI SDK
- [ ] Integrate Python backend for CAD processing
- [ ] Test AI image generation functionality

### Sprint 4: Deployment & Testing
- [ ] Deploy Python backend to Railway/Render
- [ ] Deploy to Vercel (see Phase 5)
- [ ] Run end-to-end tests
- [ ] Performance testing and optimization
- [ ] Update documentation
- [ ] Remove all Google dependencies from `package.json`

---

## Phase 5: Deployment Guides

### 5.1 Local Development Setup

#### Prerequisites
- Node.js 18+ 
- Python 3.10+
- PostgreSQL (or Supabase local)
- Git

#### Step 1: Clone and Install Frontend

```bash
# Clone repository
git clone https://github.com/your-repo/studio.git
cd studio

# Install Node dependencies
npm install
# or
yarn install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your values
```

#### Step 2: Set Up Supabase Local (Optional)

```bash
# Install Supabase CLI
# Windows (via scoop)
scoop install supabase

# Start local Supabase
supabase start

# Or use Supabase dashboard to create project
# https://supabase.com/dashboard
```

#### Step 3: Environment Variables (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (for AI features)
OPENAI_API_KEY=sk-your-openai-key

# Python Backend
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000

# Database (if using direct connection)
DATABASE_URL=postgresql://user:password@localhost:5432/studio
```

#### Step 4: Run Frontend Development Server

```bash
# Development server with hot reload
npm run dev

# Frontend runs at http://localhost:3000
```

#### Step 5: Run Python Backend Locally

```bash
# Terminal 1: Python backend
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run with uvicorn (hot reload)
uvicorn app.main:app --reload --port 8000

# Python API runs at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

#### Step 6: Verify Setup

```bash
# Test frontend
curl http://localhost:3000

# Test Python API
curl http://localhost:8000/health
curl http://localhost:8000/docs  # API documentation
```

---

### 5.2 Deploy to Vercel (Frontend)

#### Method 1: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd studio
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your team/org
# - Want to modify settings? No (use defaults)

# For production deployment
vercel --prod
```

#### Method 2: Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure environment variables:

```bash
# Environment Variables in Vercel Dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_PYTHON_API_URL=https://your-python-backend.railway.app
OPENAI_API_KEY=sk-your-openai-key
```

5. Click "Deploy"

#### Method 3: GitHub Integration (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
3. Click "Add New..." → "Project"
4. Select your repository
5. Configure environment variables
6. Click "Deploy"

**Automatic Deployments**: Every push to `main` branch triggers automatic deployment.

#### Vercel Configuration (vercel.json)

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "regions": ["iad1"]
}
```

---

### 5.3 Deploy to Supabase

#### Step 1: Set Up Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Enter project details:
   - Name: `studio`
   - Database Password: (set strong password)
   - Region: (choose closest to you)
4. Wait for project to provision (~2 minutes)

#### Step 2: Configure Database

```sql
-- Run in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables (example)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);
```

#### Step 3: Configure Storage

1. Go to Storage in Supabase dashboard
2. Create new bucket:
   - Name: `drawings`
   - Public: Yes
3. Set storage policies

#### Step 4: Get API Credentials

1. Go to Project Settings → API
2. Copy:
   - Project URL
   - `service_role` secret (keep secure!)
   - `anon` public key

#### Step 5: Deploy Edge Functions (Optional)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Initialize (if not done)
supabase init

# Deploy edge function
supabase functions deploy your-function-name

# Or deploy all
supabase functions deploy
```

---

### 5.4 Deploy to Netlify (Alternative to Vercel)

#### Method 1: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build and deploy
cd studio
netlify deploy --prod

# Or deploy to draft for testing
netlify deploy
```

#### Method 2: GitHub Integration

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select repository
4. Configure:

```bash
# Build settings
Build command: npm run build
Publish directory: .next

# Environment variables
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

5. Click "Deploy site"

#### Netlify Configuration (netlify.toml)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

#### Note on API Routes with Netlify

Netlify requires API routes to be wrapped as serverless functions. Create `netlify/functions/` directory:

```javascript
// netlify/functions/api.js
const { handler } = require('./api/your-route.js');
module.exports = handler;
```

Or use Netlify's Next.js integration:

```bash
# Install Netlify Next.js appdir plugin
npm install @netlify/plugin-nextjs
```

---

### 5.5 Deploy Python Backend

#### Option A: Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Deploy
railway up

# Set environment variables in Railway dashboard
# DATABASE_URL, OPENAI_API_KEY, etc.
```

**Railway Configuration (railway.json)**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS_VENDOR_ZIP",
    "buildCommand": "pip install -r requirements.txt",
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### Option B: Render

```bash
# Install Render CLI
gem install render-cli

# Login
render login

# Create service
render blueprint create render.yaml
```

**render.yaml**:
```yaml
services:
  - name: studio-api
    type: python
    region: oregon
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: OPENAI_API_KEY
        sync: false
```

#### Option C: Fly.io

```bash
# Install Fly.io CLI
brew install flyctl

# Login
flyctl auth login

# Launch
cd backend
flyctl launch

# Deploy
flyctl deploy
```

**Dockerfile for Python Backend**:
```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Option D: Self-Hosted (Docker)

```bash
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/studio
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=studio
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Run
docker-compose up -d
```

---

## Phase 6: Package.json Changes

### Remove:
```json
"@genkit-ai/googleai": "^1.13.0",
"@genkit-ai/next": "^1.13.0",
"@google-cloud/bigquery": "^7.8.0",
"@google-cloud/storage": "^7.11.0",
"firebase": "^11.10.0",
"genkit": "^1.13.0",
"googleapis": "^140.0.1"
```

### Add:
```json
"@supabase/supabase-js": "^2.39.0",
"@supabase/ssr": "^0.1.0",
"ai": "^3.0.0",
"@ai-sdk/openai": "^0.0.0",
"@neondatabase/serverless": "^0.9.0",
"drizzle-orm": "^0.29.0"
```

### Update Scripts:
```json
"scripts": {
  "dev": "next dev --turbopack",
  "dev:all": "concurrently \"npm run dev\" \"cd backend && npm run dev\"",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit"
}
```

---

## Phase 7: Environment Variables Reference

### Development (.env.local)

```bash
# ===================
# Supabase (Frontend)
# ===================
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ===================
# Supabase (Backend/Service Role)
# ===================
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# ===================
# AI/ML
# ===================
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-key

# ===================
# Python Backend
# ===================
PYTHON_API_URL=http://localhost:8000
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000

# ===================
# Application
# ===================
NODE_ENV=development
```

### Production (Vercel/Railway)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://user:password@host:5432/db

# AI
OPENAI_API_KEY=sk-your-openai-key

# Python Backend
NEXT_PUBLIC_PYTHON_API_URL=https://your-backend.railway.app
PYTHON_API_URL=https://your-backend.railway.app
```

---

## Phase 8: Risk Assessment & Rollback

### Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI Model Capability Differences | Medium | Test thoroughly with edge cases; switch to Claude if needed |
| Data Migration Integrity | High | Validate all records post-migration; keep backup |
| Breaking Changes in SDKs | Low | Use stable versions; maintain changelog |
| Cost Increase | Medium | Monitor usage; switch to self-hosted if needed |
| Feature Parity | Medium | Some Firebase features may require custom implementation |
| Python Backend Complexity | Medium | Start simple, iterate; use existing stone_slab_cad code |

### Rollback Plan

1. Keep Google Cloud project active for 30 days post-migration
2. Maintain data backups in both systems during transition
3. Feature flags to toggle between old/new implementations
4. Document all API changes for quick reversal if needed

---

## Phase 9: Success Metrics

- [ ] All Google packages removed from `package.json`
- [ ] Zero Google API calls in production logs
- [ ] Authentication works via Supabase
- [ ] AI image generation functional with OpenAI
- [ ] Data queries working via PostgreSQL
- [ ] File uploads working via Supabase Storage
- [ ] Python backend running and integrated
- [ ] Deployment successful on Vercel (primary)
- [ ] Deployment successful on Netlify (backup)
- [ ] All tests passing
- [ ] Local development working (frontend + backend)

---

## Appendix: File Reference Map

| Original File | New Implementation |
|--------------|-------------------|
| `src/lib/firebase.ts` | `src/lib/supabase.ts` |
| `src/ai/genkit.ts` | `src/lib/ai.ts` |
| `src/ai/flows/imageGenerationFlow.ts` | Updated with AI SDK + Python |
| `src/services/warehouseService.ts` | Updated with PostgreSQL |
| `apphosting.yaml` | Vercel (no config needed) |
| `serviceAccountKey.json` | Remove (use env vars) |
| (new) `backend/` | Python FastAPI application |

---

## Quick Start Commands

### Local Development

```bash
# Frontend only
npm run dev

# Full stack (frontend + Python backend)
npm run dev:all

# Python backend only
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### Deployment

```bash
# Deploy frontend to Vercel
vercel --prod

# Deploy Python backend to Railway
cd backend
railway up --prod

# Deploy to Netlify
netlify deploy --prod --site=your-site-id
```

---

*Document Version: 2.0*  
*Created: 2026-02-24*  
*Last Updated: 2026-02-24*
