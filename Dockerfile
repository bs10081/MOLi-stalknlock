# Use Python 3.11 slim for ARM architecture (Raspberry Pi)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y     gcc     g++     make     linux-headers-generic     && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY *.py ./
COPY *.sql ./

# Create data directory for database
RUN mkdir -p /app/data

# Environment variables
ENV PYTHONUNBUFFERED=1     DB_FILE=/app/data/moli_door.db     DOOR_LOG_FILE=/app/door_system.log     LOCK_PIN=16     LOCK_ACTIVE_LEVEL=1

# Expose Flask port
EXPOSE 5001

# Run the door system
CMD ["python", "door_system.py"]
