# Contributing to Stone Studio

Thank you for your interest in contributing to Stone Studio! This document provides guidelines and instructions for contributing to this project.

## Development Setup

This project uses a hybrid architecture (Next.js frontend + FastAPI backend + local CAD package). 

### Prerequisites
- Node.js >= 22.0.0
- Python >= 3.11
- PostgreSQL (or Supabase local instance)
- Blender >= 3.x (optional, for CAD visualization only)

### Initializing the Environment

1. **Frontend:**
   ```bash
   npm install
   ```

2. **Backend:**
   Create a virtual environment in the root directory and install dependencies:
   ```bash
   python -m venv .venv
   # Windows: .venv\Scripts\activate
   # macOS/Linux: source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```
   Note: `backend/requirements.txt` installs the local `stone_slab_cad` package in editable mode automatically.

3. **Running the Stack:**
   You can run both frontend and backend concurrently:
   ```bash
   npm run dev
   ```

## Code Style

### Frontend (TypeScript / Next.js)
- Use functional components with React Hooks.
- Prefer Tailwind CSS utility classes for styling.
- Use `lucide-react` for icons.
- Ensure all new components use the existing `shadcn/ui` foundation where applicable (`src/components/ui`).
- Type everything strictly using TypeScript.
- **Linting:** Run `npm run lint` and `npm run typecheck` before committing.

### Backend (Python / FastAPI)
- Use standard Python typing (`typing` module) for all function arguments and return types.
- Follow PEP 8 guidelines.
- Group imports: standard library first, then third-party libraries, then local application imports.
- Keep FastAPI endpoints lean; move business logic to the `app/services` directory.
- **Testing:** Write tests using `pytest` and `httpx`. Run tests via `cd backend && pytest tests/`.

## Commit Messages

We use a structured commit message format to generate clear history. Please follow these guidelines:

*   **feat:** A new feature
*   **fix:** A bug fix
*   **docs:** Documentation only changes
*   **style:** Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
*   **refactor:** A code change that neither fixes a bug nor adds a feature
*   **perf:** A code change that improves performance
*   **test:** Adding missing tests or correcting existing tests
*   **chore:** Changes to the build process or auxiliary tools and libraries such as documentation generation

**Example:**
`feat(backend): add support for new travertine material in CAD service`
`fix(ui): resolve overflow issue on mobile slab configurator`

## Pull Request Process

1. Ensure your branch is up-to-date with `main` before opening a PR.
2. Ensure all tests pass:
   - Frontend: `npm run typecheck` and `npm run lint`
   - Backend: `cd backend && pytest`
3. If you have added new features or APIs, update the relevant documentation in `README.md` or `docs/`.
4. Create the PR with a clear title and description explaining the *why* behind your changes.
5. The CI pipeline will automatically run linting and testing on your PR.
6. Once approved, the PR will be merged using "Squash and Merge" to keep the `main` history clean.
