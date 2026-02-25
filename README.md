# Studio
This is a Next.js application migrated to use Supabase and a Python FastAPI backend.

## Tech Stack
- **Frontend:** Next.js, React, Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL, Supabase Storage, Supabase Auth)
- **Backend Services:** Python, FastAPI (CAD processing, Data handling)
- **AI Integration:** Vercel AI SDK with OpenAI GPT-4o
- **Deployment:** Vercel (frontend) + Railway/Fly.io (Python backend)

## AI Architecture

The application uses a hybrid AI architecture:

### Vercel AI SDK (Next.js)
- **Chat Assistant** (`src/app/api/chat/route.ts`): Streaming chat responses using GPT-4o
- **CAD Context Injection** (`src/lib/cad-context.ts`): Provides AI with current project state
- **AI CAD Operations** (`src/app/api/ai/cad/route.ts`): Dimension suggestions, constraint checking

### Python Backend (FastAPI)
- **Geometry Analysis** (`/api/cad/ai/analyze_geometry`): Structural integrity calculations
- **Layout Optimization** (`/api/cad/ai/optimize_layout`): Bin-packing for slab cutting
- **Technical Drawing Generation** (`/api/cad/generate-drawing`): DXF/SVG output

### Communication Flow
```
User → Next.js API → OpenAI (chat/suggestions)
                    → Python Backend (geometry/layout)
                    → Supabase Storage (drawings)
```

## Getting Started

### 1. Environment Setup

Create `.env.local` with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (for AI features)
OPENAI_API_KEY=your_openai_api_key

# Python Backend
NEXT_PUBLIC_PYTHON_API_URL=http://localhost:8000
```

### 2. Frontend Development
```bash
npm install
npm run dev
```

### 3. Backend Development (Python)
Navigate to the `backend/` directory, set up your virtual environment, and run FastAPI:
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Database Setup
Run the SQL scripts in `scripts/` to set up your Supabase database:
1. `create_storage_bucket.sql` - Create the drawings storage bucket
2. `migrate_seed.sql` - Seed initial data

## API Endpoints

### Next.js API Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | Streaming chat with AI assistant |
| `/api/ai/cad` | POST | CAD-specific AI operations |

### Python Backend Routes
| Route | Method | Description |
|-------|--------|-------------|
| `/api/cad/generate-drawing` | POST | Generate technical drawing (SVG/DXF) |
| `/api/cad/ai/analyze_geometry` | POST | Analyze geometry constraints |
| `/api/cad/ai/optimize_layout` | POST | Optimize cutting layout |
| `/api/cad/materials` | GET | List available materials |

## Rate Limiting

The chat API includes built-in rate limiting:
- 20 requests per minute per IP address
- Returns 429 status when limit exceeded

## Development Notes

- The application has been migrated from Google Cloud/Firebase to Supabase
- Genkit/Gemini has been replaced with Vercel AI SDK/OpenAI
- All AI flows use `gpt-4o` as the default model
