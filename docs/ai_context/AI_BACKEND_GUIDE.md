# AI Backend Guide

This document details the conventions and architecture of the Python/FastAPI backend.

## Framework: FastAPI
- The backend is built with **FastAPI**, known for high performance and auto-generated OpenAPI documentation.
- **Entry Point:** `backend/app/main.py`. This file initializes the app, configures CORS, and includes routers.

## Directory Structure
- `backend/app/api/`: Contains the route definitions (routers). Endpoints should be grouped by domain (e.g., `cad.py`, `data.py`).
- `backend/app/models/`: Contains SQLAlchemy models that define the database schema.
- `backend/app/services/`: Contains the core business logic. API routes should remain thin and delegate complex operations to these services.
- `backend/app/schemas/` (or within domain files): Pydantic models used for validating incoming request payloads and serializing outgoing responses.

## Routing and Validation
- Define endpoints using FastAPI decorators (`@router.get()`, `@router.post()`, etc.).
- Always use **Pydantic** models to type-hint request bodies and response models. This ensures automatic validation and OpenAPI spec generation.

## Database Interaction
- **SQLAlchemy** is the chosen ORM.
- **Alembic** should be used for any database migrations (though verify existing migration setup before altering models).
- Database sessions are typically injected into routes via FastAPI Dependencies (`Depends`).

## The CAD Engine (`stone_slab_cad`)
- This is a specialized Python module responsible for core CAD operations.
- The FastAPI backend acts as an interface to this engine. When a CAD operation is requested, the relevant service should invoke functions from `stone_slab_cad`, process the result, and return it to the frontend.

## Testing
- **Pytest** is the testing framework for the backend.
- Tests are located in `backend/tests/`.
- Maintain test coverage for all new API endpoints, services, and CAD engine modifications.