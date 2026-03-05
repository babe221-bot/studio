# Project TODO List (Phase 2)

## High Priority
- [x] **Dynamic Data Integration:**
    - [x] Update frontend `Lab.tsx` and `useElementConfiguration.ts` to fetch `materials`, `surface_finishes`, and `edge_profiles` dynamically from the Python API instead of using hardcoded values in `src/lib/data.ts`.
    - [x] Create backend SQLAlchemy models and FastAPI endpoints for `surface_finishes` and `edge_profiles` (similar to `MaterialDB`), mapped to the Supabase tables defined in `scripts/migrate_seed.sql`.
- [x] **AI Context Injection:**
    - [x] Pass the active `cadContext` (current dimensions, selected material, processed edges) from the configurator state into the `useChat` hook body in `AIAssistant.tsx` to provide the LLM with true project awareness.

## Features
- [x] **Blender Containerization (Production CAD):**
    - [x] Update `backend/Dockerfile` to install `blender` system packages to support headless execution of `stone_slab_cad` rendering via the API.
    - [x] Remove legacy `weasyprint` and `reportlab` system dependencies from the Dockerfile as PDF generation has moved to the frontend/browser.
- [x] **Supabase Auth Polish:**
    - [x] Review `Header.tsx` and guest session logic (`GUEST_COOKIE_NAME`) to seamlessly bridge anonymous configurator users with authenticated Supabase sessions when saving projects.
- [x] **PDF Generation Optimization:**
    - [x] Review the browser-side `generateEnhancedPdf` flow to ensure large base64 strings don't crash mobile browsers, or finalize moving it to an edge function.

## Bugs & Fixes
- [ ] **Production Deployment Checks:**
    - [ ] Validate that the FastAPI `uvicorn` setup works correctly behind a production load balancer (e.g., ensuring `FORWARDED_ALLOW_IPS` is properly set for Railway/Fly.io if needed).

## Documentation
- [ ] **Clean Up Legacy Docs:**
    - [ ] Review `docs/archives/google-migration-plan.md` and archive or remove outdated architecture references. Ensure `docs/ai_context/AI_ARCHITECTURE_MAP.md` is accurate to the current state.

## Tech Debt
- [ ] **Frontend Test Coverage:**
    - [ ] Set up tests for critical frontend hooks (e.g., `useElementConfiguration`, `useOrderCalculations`) using Jest/React Testing Library.