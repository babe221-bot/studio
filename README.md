# Studio
This is a Next.js application migrated to use Supabase and a Python FastAPI backend.

## Tech Stack
- **Frontend:** Next.js, React, Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL, Supabase Storage, Supabase Auth)
- **Backend Services:** Python, FastAPI (CAD processing, Data handling)
- **AI Integration:** Vercel AI SDK (@ai-sdk)

## Getting Started

### 1. Environment Setup

Copy `.env.example` (or use `.env.local` directly) and fill in the necessary values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PYTHON_API_URL`
- `OPENAI_API_KEY`

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
