# Project Aura Backend - Cloud Run Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies in layers for better caching
# Layer 1: Base dependencies (changes rarely, fast to install)
COPY requirements-base.txt .
RUN pip install --upgrade pip wheel && \
    pip install --user \
    --timeout=300 \
    --default-timeout=300 \
    -r requirements-base.txt

# Layer 2: Heavy RAG/ML dependencies (changes rarely, slow to install - cached separately)
COPY requirements-rag.txt .
RUN pip install --user \
    --timeout=600 \
    --default-timeout=600 \
    -r requirements-rag.txt

# Layer 3: Pre-download HuggingFace model during build (required for Cloud Run)
# Cloud Run has a read-only filesystem, so we must bundle the model in the image
ENV HF_HOME=/app/.cache/huggingface
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface
RUN mkdir -p /app/.cache/huggingface && \
    python -c "from sentence_transformers import SentenceTransformer; model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2'); print('Model downloaded successfully')"

# Layer 4: Legacy requirements.txt for backwards compatibility (if needed)
# COPY requirements.txt .
# RUN pip install --user -r requirements.txt

# Stage 2: Production stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy pre-downloaded HuggingFace model from builder
COPY --from=builder /app/.cache/huggingface /app/.cache/huggingface

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Set HuggingFace cache location to the pre-downloaded model
ENV HF_HOME=/app/.cache/huggingface
ENV TRANSFORMERS_CACHE=/app/.cache/huggingface

# Copy application code
COPY app ./app
COPY alembic.ini .
COPY migrations ./migrations

# Copy RAG vector store (pre-built for fast startup)
COPY vector_store ./vector_store

# Create directory for credentials (will be mounted via Cloud Run secrets)
RUN mkdir -p /app/credentials

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8080

# Expose port (Cloud Run expects 8080 by default)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/health', timeout=5)" || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
