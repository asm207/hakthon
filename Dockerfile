# PaySim Sandbox — one container: FastAPI serves the API and the built React UI.

# ---- 1. Build the React UI ----
FROM node:22-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Render passes service env vars as build args. The UI calls the same origin, with the demo merchant's sandbox key.
ARG DEMO_API_KEY
ENV VITE_PAYSIM_API_KEY=$DEMO_API_KEY
RUN npm run build

# ---- 2. Python API ----
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend /build/frontend/dist /app/frontend/dist

# Render provides $PORT; TLS is terminated by Render's proxy (HTTPS for visitors).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
