# AI Workflow Commands

To ensure a stable development environment, use the following commands defined in the project.

## Running the Application

### Development Mode (Full Stack)
```bash
npm run dev
```
This uses `concurrently` to run both the Next.js frontend (with Turbopack) and the FastAPI backend (via Uvicorn) simultaneously.
- Frontend URL: Typically `http://localhost:3000`
- Backend API: Typically `http://127.0.0.1:8000`

### Running Individually
- **Frontend only:** `npm run dev:frontend`
- **Backend only:** `npm run dev:backend` (Ensure you are in the correct virtual environment if running manually).

## Building and Verification

### Build Frontend
```bash
npm run build
```
Creates an optimized production build of the Next.js application.

### Type Checking
```bash
npm run typecheck
```
Runs TypeScript compiler to check for type errors without emitting files (`tsc --noEmit`). **Crucial before committing any TypeScript changes.**

### Linting
```bash
npm run lint
```
Runs Next.js linting (ESLint). Ensure the code conforms to the project's stylistic rules.

## Testing

### Frontend / General Unit Tests
```bash
npm run test
```
Runs the Jest test suite.

### End-to-End Tests (Playwright)
Use the Playwright CLI (ensure Playwright browsers are installed: `npx playwright install`):
```bash
npx playwright test
```
Runs E2E tests located in `tests/e2e/`.

### Backend Tests (Pytest)
Navigate to the backend directory and run:
```bash
cd backend
pytest
```
Executes the Python test suite located in `backend/tests/`.