# AI Context Overview

This project is a sophisticated Full-Stack Monorepo focused on **Stone Slab CAD generation** and management.

## Core Mission
The primary objective of this project is to provide a platform for 2D/3D visualization and CAD processing of stone slabs, incorporating advanced UI capabilities and AI integrations.

## Tech Stack Summary

### Frontend
- **Framework:** Next.js (App Router, version 16+) with Turbopack.
- **Language:** TypeScript.
- **Styling:** Tailwind CSS, PostCSS.
- **UI Components:** Radix UI primitives, Shadcn UI (located in `src/components/ui/`), Lucide React icons.
- **3D Visualization:** Three.js, React Three Fiber (`@react-three/fiber`), React Three Drei (`@react-three/drei`).
- **State & Forms:** React Hook Form, Zod validation.
- **AI Integration:** Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`).

### Backend
- **Framework:** FastAPI (Python).
- **Server:** Uvicorn.
- **Database ORM:** SQLAlchemy with Alembic for migrations.
- **Validation:** Pydantic.
- **Specialized Engine:** `stone_slab_cad` (Custom Python engine for CAD generation).

### Database & Authentication
- **Provider:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`).
- **Database:** PostgreSQL.

### Testing
- **E2E:** Playwright (`tests/e2e/`).
- **Unit/Integration (Frontend):** Jest (`jest.config.js`).
- **Unit/Integration (Backend):** Pytest (`backend/tests/`).

## Key Entry Points
- **Frontend App:** `src/app/` (Next.js App Router).
- **Backend API:** `backend/app/main.py` (FastAPI initialization).
- **Package Config:** `package.json` (defines scripts and dependencies).
- **Environment:** `.env.local` (local environment variables).