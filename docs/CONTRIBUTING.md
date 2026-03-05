# Contributing to Studio

Thank you for helping build the future of CAD!

## 1. Development Environment
The project is a monorepo consisting of a Next.js frontend and a FastAPI backend.

### Frontend Setup
```bash
npm install
npm run dev
```

### Backend Setup
1.  Create a virtual environment: `python -m venv venv`
2.  Install dependencies: `pip install -r backend/requirements.txt`
3.  Install local CAD library: `pip install -e ./stone_slab_cad`
4.  Run FastAPI: `uvicorn app.main:app --reload`

### Blender Dependency
To run 3D renders locally, you must have Blender installed and in your `PATH`.
*   Alternatively, the backend uses a mock for development if `bpy` is not found.

## 2. Code Standards
*   **Frontend:** TypeScript is mandatory. Avoid `any` types.
*   **Backend:** Use Pydantic models for all API requests/responses.
*   **Styling:** Tailwind CSS only.

## 3. Pull Request Process
1.  Ensure all tests pass.
2.  Document any new API endpoints in the docstrings.
3.  Update the `ROADMAP.md` if completing a specific task.
