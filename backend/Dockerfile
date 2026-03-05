# Multi-stage Dockerfile for Studio Python API
# Build from project root: docker build -f backend/Dockerfile .

# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM python:3.11-slim as builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency definitions
COPY backend/requirements.txt .

# Create wheels for dependencies
# Note: We exclude the editable package (-e) here to avoid path issues during wheel build
# We'll filter out the local package from requirements for the wheel build
RUN grep -v "-e" requirements.txt > requirements-wheels.txt
RUN pip wheel --no-cache-dir --wheel-dir /build/wheels -r requirements-wheels.txt


# ── Stage 2: Final Runtime ────────────────────────────────────────────────────
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PYTHONPATH=/app

WORKDIR /app

# Install system dependencies
# Blender is installed from apt (approx 400-500MB)
# We clean apt lists immediately to save space
RUN apt-get update && apt-get install -y --no-install-recommends \
    blender \
    libgl1-mesa-glx \
    libxi6 \
    libxrender1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder
COPY --from=builder /build/wheels /wheels

# Install python dependencies from wheels
RUN pip install --no-cache-dir /wheels/*

# Copy application code
COPY backend /app
# Copy the local CAD library
COPY stone_slab_cad /stone_slab_cad

# Install the local package
RUN pip install -e /stone_slab_cad

# Expose port
EXPOSE $PORT

# Run the application
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'"]
