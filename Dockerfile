FROM node:20-bookworm-slim AS frontend-builder

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM python:3.11-slim AS runtime

WORKDIR /app

ARG APP_VERSION=""
ARG GIT_SHA=""
ARG BUILD_TIME=""

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY VERSION ./VERSION
COPY app/ ./app/
COPY templates/ ./templates/
COPY static/ ./static/
COPY --from=frontend-builder /frontend/dist ./frontend/dist/

RUN mkdir -p /app/data

ENV PYTHONUNBUFFERED=1 \
    APP_VERSION=${APP_VERSION} \
    GIT_SHA=${GIT_SHA} \
    BUILD_TIME=${BUILD_TIME} \
    DATABASE_URL=sqlite:///./data/moli_door.db \
    LOCK_PIN=16 \
    LOCK_ACTIVE_LEVEL=1 \
    LOCK_DURATION=3 \
    REGISTER_TIMEOUT=90

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--log-level", "warning"]
