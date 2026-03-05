# Dockerfile for Studio Python API
# Use this for deployments requiring WeasyPrint system dependencies

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install system dependencies for Blender (headless execution)
RUN apt-get update && apt-get install -y --no-install-recommends \
    blender \
    libgl1-mesa-glx \
    libxi6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE $PORT

# Run the application with proxy headers support
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'"]
