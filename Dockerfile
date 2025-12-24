# Use Python 3.11 slim for ARM architecture (Raspberry Pi)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    linux-headers-generic \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app/ ./app/
COPY templates/ ./templates/
COPY static/ ./static/
COPY frontend/dist/ ./frontend/dist/

# Create data directory for database
RUN mkdir -p /app/data

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    DATABASE_URL=sqlite:///./data/moli_door.db \
    LOCK_PIN=16 \
    LOCK_ACTIVE_LEVEL=1 \
    LOCK_DURATION=3 \
    REGISTER_TIMEOUT=90

# Expose FastAPI port
EXPOSE 8000

# Run the FastAPI app with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--log-level", "warning"]
