# Project TODO List

## High Priority
- [x] **Fix Backend Environment:**
    - [x] Resolve missing `fastapi` dependency in `backend/app/main.py`. Ensure virtual environment is correctly set up and activated.
    - [x] Investigate `stone_slab_cad/utils/mcp_visualization.py` dependencies (`bpy`, `bmesh`). This code requires a Blender environment.
        - [x] **Decision:** Determine if this should run in a Docker container with Blender or if it's a standalone utility.
        - [x] Add instructions for running this code to `README.md`.
- [x] **Database Integration:**
    - [x] `backend/app/services/cad_service.py`: Implement fetching materials from Supabase `materials` table (currently hardcoded or mocked). *Search for "TODO Sprint 3"*

## Features
- [x] **Backend Testing:**
    - [x] Set up `pytest` for the backend.
    - [x] Create initial test suite for `backend/app/main.py` (health check, basic endpoints).
- [x] **CI/CD Pipeline:**
    - [x] Create `.github/workflows/main.yml` for automated testing and linting.
    - [x] Configure separate jobs for frontend (Next.js) and backend (FastAPI).
- [x] **Frontend Polish:**
    - [x] Verify all UI components have proper loading states.
    - [x] Ensure error handling is robust (e.g., toast notifications for API failures).

## Bugs & Fixes
- [ ] **Path Injection Hack:**
    - [ ] Refactor `backend/app/services/cad_service.py` to avoid `sys.path.insert` for `stone_slab_cad`. Consider packaging `stone_slab_cad` as a local installable package (`pip install -e ./stone_slab_cad`).
- [ ] **LSP Errors:**
    - [ ] Fix import errors in `backend/app/main.py` (`fastapi`, `fastapi.middleware.cors`).

## Documentation
- [ ] **Update README.md:**
    - [ ] Document the `stone_slab_cad` module usage and its Blender dependency.
    - [ ] Add explicit setup instructions for the backend virtual environment.
- [ ] **Create CONTRIBUTING.md:**
    - [ ] Add guidelines for code style, commit messages, and PR process.

## Tech Debt
- [ ] **Dependency Management:**
    - [ ] Review `backend/requirements.txt` and remove unused dependencies.
    - [ ] Ensure `package.json` scripts are up-to-date (e.g., `dev:backend` command).

## Notes
- The project has a hybrid structure (Next.js frontend + FastAPI backend + Blender/Python CAD utils).
- `stone_slab_cad` appears to be a shared library but is currently just a directory.
