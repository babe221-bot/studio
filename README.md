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
The project uses a Python virtual environment located in the root directory (`.venv`).

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt
```

You can start both frontend and backend concurrently from the root directory:
```bash
npm run dev
```

#### Blender Dependency for CAD Visualization
The module `stone_slab_cad/utils/mcp_visualization.py` requires Blender's Python API (`bpy`, `bmesh`). 
This is a standalone utility that must be executed via a Blender instance in background mode, not via the standard Python interpreter.
To use it:
1. Ensure Blender 3.x+ is installed and accessible in your system PATH.
2. Run scripts via: `blender --background --python stone_slab_cad/utils/mcp_visualization.py`

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

- All AI flows use `gpt-4o` as the default model
- The application has been migrated from Google Cloud/Firebase to Supabase
- Genkit/Gemini has been replaced with Vercel AI SDK/OpenAI

## AI Agent Context
If you are an AI coding assistant working on this project, please consult the documentation in `docs/ai_context/` to understand the architecture, patterns, and conventions:
- [AI Overview](docs/ai_context/AI_OVERVIEW.md)
- [Architecture Map](docs/ai_context/AI_ARCHITECTURE_MAP.md)
- [Frontend Guide](docs/ai_context/AI_FRONTEND_GUIDE.md)
- [Backend Guide](docs/ai_context/AI_BACKEND_GUIDE.md)
- [Workflow Commands](docs/ai_context/AI_WORKFLOW_COMMANDS.md)
