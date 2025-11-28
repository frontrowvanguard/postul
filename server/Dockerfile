# Dockerfile for Postul API Server with Supertonic TTS
FROM python:3.13-slim

# Install system dependencies including Git LFS
RUN apt-get update && apt-get install -y \
    git \
    git-lfs \
    curl \
    build-essential \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Initialize Git LFS
RUN git lfs install

# Install uv for fast Python package management
RUN pip install --no-cache-dir uv

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install Python dependencies
RUN uv sync --frozen --no-dev

# Copy application code
COPY . .

# Download Supertonic models (if not already present)
# This will download models if assets/onnx directory doesn't exist or is empty
RUN if [ ! -d "assets/onnx" ] || [ -z "$(ls -A assets/onnx/*.onnx 2>/dev/null)" ]; then \
        echo "Downloading Supertonic models..." && \
        uv run download-supertonic-models --force || echo "Warning: Model download failed, models may need to be mounted"; \
    else \
        echo "Models already present, skipping download"; \
    fi

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the server
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

