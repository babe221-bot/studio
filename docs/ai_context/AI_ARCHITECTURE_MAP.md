# AI Architecture Map

The application follows a decoupled full-stack architecture where the Next.js frontend communicates with a FastAPI backend, both co-located in a monorepo.

## High-Level Architecture
1. **Frontend Layer (Next.js):** Handles UI rendering, 3D visualization, user interactions, and client-side state. Uses Server Actions for some form submissions and API routes for backend proxying or external service integration.
2. **Backend API Layer (FastAPI):** Exposes RESTful endpoints for CAD processing, data management, and complex business logic.
3. **CAD Engine Layer (Python):** The `stone_slab_cad` module contains the core logic for generating, manipulating, and exporting 2D/3D CAD data.
4. **Data Layer (Supabase):** Manages user authentication, sessions, and PostgreSQL database storage.

## Directory Structure & Responsibilities

| Path | Responsibility |
| :--- | :--- |
| `/src/app/` | Next.js App Router. Contains page components, layouts, and Server Actions (e.g., `actions.ts`). |
| `/src/components/` | Reusable React components. Divided into standard UI, layouts, and specialized domains. |
| `/src/components/ui/` | Shadcn UI components built on Radix UI primitives. |
| `/src/components/three/` | Three.js / React Three Fiber components for 3D slab visualization. |
| `/src/lib/` | Shared utilities, Supabase client configurations, and TypeScript schemas (Zod). |
| `/src/hooks/` | Custom React hooks for encapsulating frontend logic. |
| `/src/services/` | Client-side abstractions for fetching data from the backend or external APIs. |
| `/backend/app/` | Core FastAPI application. Contains `main.py` (entry point). |
| `/backend/app/api/` | FastAPI route definitions (e.g., `cad.py`, `data.py`). |
| `/backend/app/models/` | SQLAlchemy database models. |
| `/backend/app/services/` | Backend business logic encapsulating database calls and external integrations. |
| `/stone_slab_cad/` | Python engine for CAD generation and processing. |
| `/tests/` | Playwright E2E tests and Jest frontend tests. |
| `/backend/tests/` | Pytest suites for the FastAPI backend and CAD engine. |

## Data Flow Example (CAD Generation)
1. User interacts with a 3D component in the UI (`src/components/three/`).
2. The frontend triggers an API call to the backend via a service (`src/services/`).
3. The FastAPI router (`backend/app/api/cad.py`) receives the request and validates the payload using Pydantic.
4. The router delegates the processing to a service, which interacts with the `stone_slab_cad` engine.
5. The resulting CAD data is returned to the frontend and visualized.