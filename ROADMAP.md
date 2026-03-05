# Project Roadmap (Phase 4)

## High Priority
- [x] **Asynchronous CAD Workers:** Move Blender/DXF rendering to a Redis-backed Celery/RQ queue to prevent blocking FastAPI request threads.
- [ ] **Stripe Payments:** Implement a "Secure Deposit" flow using Stripe Elements to allow users to reserve slabs directly from the configurator.
- [x] **Supabase Auth Bridge:** Complete the transition from anonymous guest cookies to full Supabase Auth sessions for project persistence.
- [x] **Database Schema Expansion:** Add `orders`, `invoices`, and `user_profiles` tables to Supabase with proper RLS policies.
- [x] **Inventory API:** Connect `MaterialDB` to a real-time inventory system (mock or external API) to show "In Stock" labels on materials.
- [x] **Production-Ready Docker:** Optimize `backend/Dockerfile` using multi-stage builds to reduce image size from ~2GB (Blender included) to <800MB.
- [x] **Global State Management:** Migration of component-local state in `Lab.tsx` to a robust Zustand or Redux store for better deep-linking support.
- [x] **Real-time Price Engine:** Move price calculation logic from frontend `useOrderCalculations` to the backend to ensure data integrity for payments.
- [x] **Sentry Integration:** Set up full-stack error tracking for both Next.js and FastAPI to capture production failures.
- [x] **PostHog Analytics:** Implement event tracking for the configuration funnel (Selection -> Dimensioning -> Render -> Checkout)
- [ ] **Real-time Price Engine:** Move price calculation logic from frontend `useOrderCalculations` to the backend to ensure data integrity for payments.
- [ ] **Sentry Integration:** Set up full-stack error tracking for both Next.js and FastAPI to capture production failures.
- [ ] **PostHog Analytics:** Implement event tracking for the configuration funnel (Selection -> Dimensioning -> Render -> Checkout).

## Features
- [x] **AI "Design Review":** Enhance `AIAssistant.tsx` to provide structural safety warnings (e.g., "Slab too thin for this length").
- [x] **WebXR / AR Preview:** Add a "View in your room" button using `<model-viewer>` for real-world placement of designed slabs.
- [ ] **Grain Alignment Tool:** UI for "Bookmatching" where users can align textures/veins across multiple slab joints.
- [x] **Advanced PBR Materials:** Implement `pbr_materials.py` to support realistic light reflection, roughness, and normal maps in the 3D viewer.
- [x] **GLB/USDZ Export:** Add a "Download 3D Model" button for professional architects to import designs into Revit or AutoCAD.
- [ ] **PDF Quotation 2.0:** Auto-generate branded PDFs containing 3D render snapshots, 2D technical drawings, and itemized costs.
- [ ] **Voice Commands:** Integrate Web Speech API for "Hands-free" configuration (e.g., "Set length to 120 centimeters").
- [ ] **Shared Workspaces:** Allow users to generate a "Collab Link" to share a live configuration with a client or contractor.
- [ ] **Multi-Slab Projects:** Support for complex projects with multiple elements (e.g., matching countertop, backsplash, and island).
- [ ] **User Gallery:** A community section where users can opt-in to show their designs as inspiration for others.

## Bugs & Fixes
- [x] **SQLAlchemy Resolution:** Fix `Import "sqlalchemy.ext.asyncio" could not be resolved` in `cad_service.py` by aligning venv and LSP settings.
- [x] **Unbound CAD Variables:** Resolve `_generate_2d_drawings is possibly unbound` in `cad_service.py` error handling logic.
- [x] **Blender Module Mocking:** Implement a `bpy` mock for local development to prevent crashes when Blender is not installed on the dev machine.
- [x] **Mobile PDF Crash:** Optimize `generateEnhancedPdf` to use streaming or offload to Edge functions to prevent OOM on mobile browsers.
- [x] **Edge Treatment Visualization:** Fix the Z-fighting artifacts on 3D meshes when applying complex edge profiles in `slab3d.py`.
- [ ] **Viewport Performance:** Optimize `viewport_performance.py` to maintain 60fps on integrated GPUs during 3D rotations.
- [x] **Texture Mapping Skew:** Correct the UV mapping in `texture_mapping.py` which currently stretches textures on vertical slab edges.
- [x] **IOS Safari Input Lag:** Debug and fix the 300ms delay on numeric inputs in the configuration sidebar on iOS.
- [x] **CORS Configuration:** Tighten FastAPI CORS middleware to allow only specific production domains while maintaining local dev access.
- [x] **Memory Leak:** Investigate and fix the memory leak in the 3D preview window when switching materials rapidly.

## Documentation
- [x] **API Reference:** Generate OpenAPI (Swagger) documentation for all `cad_service` endpoints and host at `/docs`.
- [x] **CAD Engine Internals:** Document the coordinate system and mesh generation logic in `stone_slab_cad` for future contributors.
- [x] **Deployment Guide:** Detailed instructions for deploying the Blender-heavy backend to Railway or AWS ECS.
- [x] **Material Sourcing Guide:** A standard procedure for adding new stone textures (scanning, PBR map generation, and DB entry).
- [x] **AI Prompt Engineering:** Document the context injection strategy used in `buildCADContext` to maintain AI consistency.
- [x] **Frontend Component Library:** Setup guide for documentation (Storybook initial docs).
- [x] **Troubleshooting FAQ:** Common issues for users (e.g., "Why is my 3D render taking so long?").
- [x] **Security Audit:** Document RLS policies and data encryption at rest for user designs.
- [x] **Contribution Guidelines:** Setup guide for `npm`, `pip`, and `blender` for new developers joining the project.
- [x] **User Manual:** A visually rich guide for end-users on how to get the most out of the "Intelligent Designer" features.

## Tech Debt
- [ ] **Decouple CAD Logic:** Refactor `slab3d.py` to separate geometric math from Blender-specific `bpy` API calls.
- [ ] **Unit Test Coverage:** Aim for >80% coverage on `src/lib/calculations.ts` and `backend/app/logic`.
- [ ] **End-to-End Tests:** Implement Playwright tests for the critical "Select -> Configure -> Checkout" user journey.
- [ ] **CI/CD Optimization:** Implement GitHub Actions caching for `node_modules` and `python-venv` to speed up builds.
- [ ] **TypeScript Strict Mode:** Address all `any` types in `AIAssistant.tsx` and `useChat` hook usage.
- [ ] **Dependency Audit:** Update outdated packages in `package.json` and `requirements.txt` to mitigate security vulnerabilities.
- [ ] **Environment Variable Sync:** Implement a standard `.env.example` and a script to sync secrets between local and production.
- [ ] **Linters & Formatters:** Standardize `eslint`, `prettier`, and `ruff` configurations across the monorepo.
- [ ] **Logging Framework:** Replace `print` statements with a structured logging library (e.g., `loguru`) in the backend.
- [ ] **Pre-commit Hooks:** Add `husky` to run linting and type-checking before every commit to prevent regression.
